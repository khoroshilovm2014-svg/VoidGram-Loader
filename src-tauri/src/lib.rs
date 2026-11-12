use std::path::Path;
use std::process::Command;

fn run_tool(program: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new(program)
        .args(args)
        .output()
        .map_err(|error| format!("Не удалось запустить {program}: {error}. Проверьте установку libimobiledevice и PATH."))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Ok(if stdout.is_empty() { stderr } else { stdout })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Err(if stderr.is_empty() { stdout } else { stderr })
    }
}

#[tauri::command]
fn detect_devices() -> Result<String, String> {
    let result = run_tool("idevice_id", &["-l"])?;
    if result.is_empty() {
        Ok("iPhone не обнаружен. Проверьте USB-подключение и доверие этому компьютеру.".to_string())
    } else {
        Ok(result)
    }
}

#[tauri::command]
fn install_ipa(path: String) -> Result<String, String> {
    let ipa_path = Path::new(&path);
    if !ipa_path.is_file() {
        return Err("Выбранный IPA-файл не найден.".to_string());
    }
    if ipa_path.extension().and_then(|ext| ext.to_str()).map(|ext| !ext.eq_ignore_ascii_case("ipa")).unwrap_or(true) {
        return Err("Выберите файл с расширением .ipa.".to_string());
    }
    run_tool("ideviceinstaller", &["-i", &path])
}

#[tauri::command]
fn check_tools() -> Result<String, String> {
    let id = run_tool("idevice_id", &["--version"])?;
    let installer = run_tool("ideviceinstaller", &["--version"])?;
    Ok(format!("idevice_id: {id}\nideviceinstaller: {installer}"))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![detect_devices, install_ipa, check_tools])
        .run(tauri::generate_context!())
        .expect("VoidGram Loader error");
}
