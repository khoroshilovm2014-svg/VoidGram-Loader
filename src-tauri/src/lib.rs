use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{fs, path::PathBuf, process::Command};
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
fn detect_devices() -> Result<String, String> {
    let output = Command::new("idevice_id").arg("-l").output()
        .map_err(|e| format!("Не удалось запустить idevice_id: {e}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
fn install_ipa(path: String) -> Result<String, String> {
    let output = Command::new("ideviceinstaller").args(["-i", &path]).output()
        .map_err(|e| format!("Не удалось запустить ideviceinstaller: {e}"))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
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
