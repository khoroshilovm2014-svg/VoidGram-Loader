use std::process::Command;

#[tauri::command]
fn detect_devices() -> Result<String, String> {
    let o = Command::new("idevice_id").arg("-l").output()
        .map_err(|e| format!("idevice_id РЅРµ РЅР°Р№РґРµРЅ: {e}"))?;
    if !o.status.success() {
        return Err(String::from_utf8_lossy(&o.stderr).to_string());
    }
    Ok(String::from_utf8_lossy(&o.stdout).trim().to_string())
}

#[tauri::command]
fn install_ipa(path: String) -> Result<String, String> {
    let o = Command::new("ideviceinstaller").args(["-i", &path]).output()
        .map_err(|e| format!("ideviceinstaller РЅРµ РЅР°Р№РґРµРЅ: {e}"))?;
    if o.status.success() {
        Ok(String::from_utf8_lossy(&o.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&o.stderr).to_string())
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![detect_devices, install_ipa])
        .run(tauri::generate_context!())
        .expect("VoidGram Loader error");
}