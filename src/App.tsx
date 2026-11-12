import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export default function App() {
  const [device, setDevice] = useState("Устройство не проверено");
  const [ipa, setIpa] = useState("");
  const [log, setLog] = useState("Готово к работе");
  const [busy, setBusy] = useState(false);

  async function detect() {
    setBusy(true);
    try {
      const result = await invoke<string>("detect_devices");
      setDevice(result || "Устройство не найдено");
      setLog(result || "Подключите iPhone и повторите проверку");
    } catch (error) {
      setLog(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function chooseIpa() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "IPA-файл", extensions: ["ipa"] }]
      });
      if (typeof selected === "string") setIpa(selected);
    } catch (error) {
      setLog(String(error));
    }
  }

  async function install() {
    if (!ipa) return;
    setBusy(true);
    try {
      setLog(await invoke<string>("install_ipa", { path: ipa }));
    } catch (error) {
      setLog(String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <header>
        <div className="logo">V</div>
        <div>
          <h1>VoidGram Loader</h1>
          <small>Установка IPA на iPhone и iPad</small>
        </div>
        <span className="version">0.4.1</span>
      </header>

      <section className="panel">
        <h2>Устройство</h2>
        <p>{device}</p>
        <button disabled={busy} onClick={detect}>
          {busy ? "Пожалуйста, подождите…" : "Найти устройство"}
        </button>
      </section>

      <section className="panel">
        <h2>IPA-файл</h2>
        <input readOnly value={ipa} placeholder="Выберите IPA-файл" />
        <button className="secondary" disabled={busy} onClick={chooseIpa}>Обзор</button>
        <button disabled={!ipa || busy} onClick={install}>Установить</button>
      </section>

      <section className="panel">
        <h2>Журнал</h2>
        <pre>{log}</pre>
      </section>
      <p className="note">Для обнаружения устройства и установки требуется установленный драйвер Apple и инструменты libimobiledevice. Подписание приложений Apple ID в этой версии пока не реализовано.</p>
    </main>
  );
}
