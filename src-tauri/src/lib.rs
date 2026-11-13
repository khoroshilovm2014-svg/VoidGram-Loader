use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{fs, path::{Path, PathBuf}, process::{Command, Output}};
use tauri::Manager;

const RELEASE_API: &str = "https://api.github.com/repos/neosay-dev/VoidGram/releases/latest";
const RELEASE_DOWNLOAD_PREFIX: &str = "https://github.com/neosay-dev/VoidGram/releases/download/";

#[derive(Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
    digest: Option<String>,
}

#[derive(Deserialize)]
struct GithubRelease {
    tag_name: String,
    name: String,
    html_url: String,
    published_at: String,
    body: Option<String>,
    assets: Vec<GithubAsset>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ReleaseInfo {
    version: String,
    title: String,
    page_url: String,
    published_at: String,
    ipa_name: String,
    ipa_size: u64,
    sha256: Option<String>,
    requires_signing: bool,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadedIpa {
    version: String,
    path: String,
    size: u64,
    sha256: String,
    requires_signing: bool,
}

// Prefer the copy shipped inside the installer; PATH is only a development fallback.
fn device_tool(app: &tauri::AppHandle, name: &str) -> Command {
    let exe_name = format!("{name}.exe");
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("resources").join("idevice").join(&exe_name);
        if bundled.is_file() {
            let mut command = Command::new(&bundled);
            if let Some(parent) = bundled.parent() {
                command.current_dir(parent);
            }
            return command;
        }
        // Also support archives that preserve an extra top-level directory.
        if let Ok(entries) = fs::read_dir(resource_dir.join("resources").join("idevice")) {
            for entry in entries.flatten() {
                let candidate = entry.path().join(&exe_name);
                if candidate.is_file() {
                    let mut command = Command::new(&candidate);
                    if let Some(parent) = candidate.parent() {
                        command.current_dir(parent);
                    }
                    return command;
                }
            }
        }
    }
    Command::new(exe_name)
}

fn run_device_tool(app: &tauri::AppHandle, name: &str, args: &[&str]) -> Result<String, String> {
    let output = device_tool(app, name).args(args).output()
        .map_err(|e| format!("Не удалось запустить {name}: {e}. Проверьте USB-подключение и драйвер Apple Mobile Device Support."))?;
    output_text(output, name)
}

fn output_text(output: Output, program: &str) -> Result<String, String> {
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_owned();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
    if output.status.success() {
        Ok(if stdout.is_empty() { stderr } else { stdout })
    } else {
        Err(if stderr.is_empty() { if stdout.is_empty() { format!("{program} завершился с кодом {}", output.status) } else { stdout } } else { stderr })
    }
}

async fn fetch_latest_release() -> Result<GithubRelease, String> {
    let client = reqwest::Client::builder()
        .user_agent("VoidGram-Loader")
        .build()
        .map_err(|e| format!("Не удалось подготовить HTTP-клиент: {e}"))?;
    let response = client.get(RELEASE_API)
        .header(reqwest::header::ACCEPT, "application/vnd.github+json")
        .send().await.map_err(|e| format!("Не удалось проверить релиз VoidGram: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("GitHub вернул ошибку {} при проверке релиза", response.status()));
    }
    response.json::<GithubRelease>().await
        .map_err(|e| format!("Не удалось прочитать сведения о релизе: {e}"))
}

fn release_ipa(release: &GithubRelease) -> Result<&GithubAsset, String> {
    release.assets.iter()
        .find(|asset| asset.name.to_ascii_lowercase().ends_with(".ipa"))
        .ok_or_else(|| format!("В релизе {} не найден IPA-файл", release.tag_name))
}

fn needs_signing(release: &GithubRelease) -> bool {
    let notes = release.body.as_deref().unwrap_or("").to_ascii_lowercase();
    notes.contains("unsigned ipa") || notes.contains("неподписанный")
}

#[tauri::command]
async fn latest_voidgram_release() -> Result<ReleaseInfo, String> {
    let release = fetch_latest_release().await?;
    let asset = release_ipa(&release)?;
    let sha256 = asset.digest.as_deref()
        .and_then(|value| value.strip_prefix("sha256:"))
        .map(str::to_owned);
    Ok(ReleaseInfo {
        version: release.tag_name.trim_start_matches('v').to_owned(),
        title: release.name,
        page_url: release.html_url,
        published_at: release.published_at,
        ipa_name: asset.name.clone(),
        ipa_size: asset.size,
        sha256,
        requires_signing: needs_signing(&release),
    })
}

#[tauri::command]
async fn download_latest_voidgram_ipa(app: tauri::AppHandle) -> Result<DownloadedIpa, String> {
    let release = fetch_latest_release().await?;
    let asset = release_ipa(&release)?;
    if !asset.browser_download_url.starts_with(RELEASE_DOWNLOAD_PREFIX) {
        return Err("GitHub вернул неожиданный адрес IPA; загрузка отменена".to_owned());
    }

    let client = reqwest::Client::builder()
        .user_agent("VoidGram-Loader")
        .build().map_err(|e| format!("Не удалось подготовить HTTP-клиент: {e}"))?;
    let response = client.get(&asset.browser_download_url).send().await
        .map_err(|e| format!("Не удалось скачать IPA: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("GitHub вернул ошибку {} при скачивании IPA", response.status()));
    }
    let bytes = response.bytes().await
        .map_err(|e| format!("Не удалось получить содержимое IPA: {e}"))?;
    if bytes.len() as u64 != asset.size {
        return Err(format!("Размер IPA не совпал: ожидалось {} байт, получено {}", asset.size, bytes.len()));
    }

    let digest = format!("{:x}", Sha256::digest(&bytes));
    if let Some(expected) = asset.digest.as_deref().and_then(|v| v.strip_prefix("sha256:")) {
        if !digest.eq_ignore_ascii_case(expected) {
            return Err("Проверка SHA-256 не пройдена. Файл не сохранён.".to_owned());
        }
    }

    let version = release.tag_name.trim_start_matches('v').to_owned();
    let file_name = format!("VoidGram-{version}.ipa");
    let mut folder: PathBuf = app.path().app_local_data_dir()
        .map_err(|e| format!("Не удалось определить папку данных приложения: {e}"))?;
    folder.push("downloads");
    fs::create_dir_all(&folder)
        .map_err(|e| format!("Не удалось создать папку загрузок: {e}"))?;
    let path = folder.join(file_name);
    fs::write(&path, &bytes)
        .map_err(|e| format!("Не удалось сохранить IPA: {e}"))?;

    Ok(DownloadedIpa {
        version,
        path: path.to_string_lossy().into_owned(),
        size: bytes.len() as u64,
        sha256: digest,
        requires_signing: needs_signing(&release),
    })
}

#[tauri::command]
fn detect_devices(app: tauri::AppHandle) -> Result<String, String> {
    let ids = run_device_tool(&app, "idevice_id", &["-l"])?;
    let udid = ids.lines().find(|line| !line.trim().is_empty()).map(str::trim);
    let Some(udid) = udid else { return Ok(String::new()); };

    let name = run_device_tool(&app, "ideviceinfo", &["-u", udid, "-k", "DeviceName"])
        .unwrap_or_else(|_| "iPhone".to_owned());
    let product = run_device_tool(&app, "ideviceinfo", &["-u", udid, "-k", "ProductType"])
        .unwrap_or_default();
    let ios = run_device_tool(&app, "ideviceinfo", &["-u", udid, "-k", "ProductVersion"])
        .unwrap_or_default();

    Ok(format!("{name}{}\niOS {}\nUDID: {udid}",
        if product.is_empty() { String::new() } else { format!(" ({product})") },
        if ios.is_empty() { "не определена" } else { &ios }))
}

#[tauri::command]
fn install_ipa(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let ipa_path = Path::new(&path);
    if !ipa_path.is_file() {
        return Err("Выбранный IPA-файл не найден.".to_owned());
    }
    if ipa_path.extension().and_then(|ext| ext.to_str())
        .map(|ext| !ext.eq_ignore_ascii_case("ipa")).unwrap_or(true) {
        return Err("Выберите файл с расширением .ipa.".to_owned());
    }

    let ids = run_device_tool(&app, "idevice_id", &["-l"])?;
    let udid = ids.lines().find(|line| !line.trim().is_empty()).map(str::trim)
        .ok_or_else(|| "iPhone не найден. Сначала подключите устройство по USB.".to_owned())?;

    let version = run_device_tool(&app, "ideviceinstaller", &["--version"])
        .unwrap_or_default();
    let mut command = device_tool(&app, "ideviceinstaller");
    command.arg("-u").arg(udid);
    if version.contains("1.2") || version.contains("2.") {
        command.arg("install").arg(&path);
    } else {
        command.arg("-i").arg(&path);
    }
    let output = command.output()
        .map_err(|e| format!("Не удалось запустить ideviceinstaller: {e}"))?;
    output_text(output, "ideviceinstaller")
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            detect_devices,
            install_ipa,
            latest_voidgram_release,
            download_latest_voidgram_ipa
        ])
        .run(tauri::generate_context!())
        .expect("VoidGram Loader error");
}
