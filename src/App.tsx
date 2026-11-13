import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

type Page = "device" | "apple" | "tools" | "settings";
type ReleaseInfo = { version: string; title: string; pageUrl: string; publishedAt: string; ipaName: string; ipaSize: number; sha256: string | null; requiresSigning: boolean };
type DownloadedIpa = { version: string; path: string; size: number; sha256: string; requiresSigning: boolean };

function LogoMark({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 120 120" role="img" aria-label="VoidGram">
    <path fill="currentColor" d="M55 4 55 62 26 113 Q24 117 19 117 H8 Q0 117 4 109 L49 14 Q52 7 55 4Z"/>
    <path fill="currentColor" d="M65 4 65 62 94 113 Q96 117 101 117 H112 Q120 117 116 109 L71 14 Q68 7 65 4Z"/>
    <path fill="#bdbdbd" d="M57 75 Q60 70 63 75 L84 111 Q87 117 80 117 H40 Q33 117 36 111Z"/>
  </svg>;
}

export default function App() {
  const [page, setPage] = useState<Page>("device");
  const [device, setDevice] = useState("");
  const [deviceState, setDeviceState] = useState<"idle" | "connected" | "missing" | "error">("idle");
  const [ipa, setIpa] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Готово к работе");
  const [appleEmail, setAppleEmail] = useState("");
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [downloadedVersion, setDownloadedVersion] = useState("");
  const [requiresSigning, setRequiresSigning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  function report(message: string) {
    setNotice(message);
    setHistory(old => [`${new Date().toLocaleTimeString("ru-RU")} · ${message}`, ...old].slice(0, 30));
  }

  async function detect() {
    setBusy(true); report("Проверка USB-подключения…");
    try {
      const result = await invoke<string>("detect_devices");
      setDevice(result.trim());
      setDeviceState(result.trim() ? "connected" : "missing");
      report(result.trim() ? "iPhone обнаружен" : "Устройство не найдено. Проверьте кабель и доверие этому компьютеру.");
    } catch (error) {
      setDeviceState("error"); report(String(error));
    } finally { setBusy(false); }
  }

  async function chooseIpa() {
    try {
      const selected = await open({ multiple: false, filters: [{ name: "IPA", extensions: ["ipa"] }] });
      if (typeof selected === "string") {
        setIpa(selected); setRequiresSigning(false); setDownloadedVersion("Локальный файл");
        report("IPA-файл выбран. Перед установкой проверьте, что он подписан для вашего устройства.");
      }
    } catch (error) { report(String(error)); }
  }

  async function checkRelease() {
    try {
      const value = await invoke<ReleaseInfo>("latest_voidgram_release");
      setRelease(value); report(`Доступна версия VoidGram ${value.version}`);
    } catch (error) { setRelease(null); report(`Проверка релиза не удалась: ${String(error)}`); }
  }

  async function downloadRelease() {
    setBusy(true); report("Загрузка IPA и проверка файла…");
    try {
      const value = await invoke<DownloadedIpa>("download_latest_voidgram_ipa");
      setIpa(value.path); setDownloadedVersion(value.version); setRequiresSigning(value.requiresSigning);
      report(`VoidGram ${value.version} загружен. SHA-256: ${value.sha256.slice(0, 16)}…`);
    } catch (error) { report(String(error)); }
    finally { setBusy(false); }
  }

  async function install() {
    if (!ipa) return;
    if (requiresSigning) { report("Установка остановлена: этот IPA требует подписи Apple Developer. Неподписанный файл не устанавливается."); return; }
    setBusy(true); report("Передача IPA на iPhone…");
    try {
      const result = await invoke<string>("install_ipa", { path: ipa });
      report(result || "Команда установки завершилась без ошибки.");
    } catch (error) { report(String(error)); }
    finally { setBusy(false); }
  }

  useEffect(() => { void checkRelease(); void detect(); }, []);

  const nav: { id: Page; label: string; icon: string }[] = [
    { id: "device", label: "Устройство", icon: "▯" },
    { id: "apple", label: "Apple ID", icon: "♙" },
    { id: "tools", label: "Инструменты", icon: "⚒" },
    { id: "settings", label: "Настройки", icon: "⚙" },
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-logo"><LogoMark className="void-mark" /><strong>VoidGram Loader</strong></div>
      <div className="brand-hero"><LogoMark className="hero-mark" /><h2>VoidGram Loader</h2><p>v0.5.0</p></div>
      <nav>{nav.map(item => <button key={item.id} className={page === item.id ? "nav-item active" : "nav-item"} onClick={() => setPage(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav>
      <div className="sidebar-status"><i className="green-dot"/><span>Готово к работе</span></div>
    </aside>

    <main className="workspace">
      {page === "device" && <div className="page-content">
        <h1>Устройство</h1>
        <section className="panel device-panel">
          <div className="phone-outline"><span/></div>
          <div className="device-details">
            <div className="device-heading"><h2>{device ? device.split("\n")[0] : "iPhone не подключён"}</h2><span className="usb-tag">USB</span></div>
            <p>{device ? device.split("\n").slice(1,2)[0] || "Информация об iOS недоступна" : "Подключите iPhone к компьютеру через USB"}</p>
            <p>{device ? device.split("\n").slice(2).join(" ") : "UDID: —"}</p>
            <div className="connection"><span className={deviceState === "connected" ? "state-dot online" : "state-dot offline"}/><span>Состояние: {deviceState === "connected" ? "Подключено" : deviceState === "error" ? "Ошибка подключения" : "Не подключено"}</span></div>
          </div>
          <div className="device-actions">
            <button className="outline-button" onClick={detect} disabled={busy}><span className="button-symbol">↻</span>Обновить информацию</button>
            <button className="outline-button" onClick={() => report(device || "Сведения появятся после подключения iPhone.")}><span className="button-symbol">ⓘ</span>Сведения об устройстве</button>
          </div>
        </section>

        <section className="panel tools-panel">
          <h2>Основные инструменты</h2>
          <div className="inner-card apple-row">
            <div className="person-symbol">♙</div>
            <div className="row-copy"><h3>Войти в Apple ID</h3><p>{appleEmail || "Войдите в Apple ID для доступа"}<br/>к сервисам и сертификатам.</p></div>
            <button className="light-button" onClick={() => setPage("apple")}>⇥　Войти в Apple ID</button>
          </div>
        </section>

        <section className="panel install-panel">
          <h2>Установка VoidGram</h2>
          <div className="inner-card install-row">
            <div className="app-icon"><LogoMark className="hero-mark" /></div>
            <div className="row-copy"><h3>VoidGram</h3><p>Неофициальный мессенджер VoidGram</p><p>От команды разработчиков VoidDev.</p>{release && <small>Последняя версия: {release.version} · {(release.ipaSize / 1048576).toFixed(1)} МБ</small>}</div>
            <button className="light-button install-button" onClick={downloadRelease} disabled={busy || !release}><span className="button-symbol">↓</span>{busy ? "Загрузка…" : "Установить"}</button>
          </div>
          {downloadedVersion && <div className="downloaded-note"><span>{`IPA: ${downloadedVersion}`}</span><button className="outline-button compact" onClick={install} disabled={busy || deviceState !== "connected" || requiresSigning}>{requiresSigning ? "Требуется подпись" : "Установить на iPhone"}</button></div>}
        </section>
      </div>}

      {page === "apple" && <div className="page-content secondary-page"><h1>Apple ID</h1><section className="panel form-panel"><h2>Учётная запись Apple</h2><p>Для подписания приложений нужен поддерживаемый поток авторизации Apple. Ввод пароля Apple ID в сторонней форме не поддерживается.</p><label>Apple ID</label><input value={appleEmail} onChange={e => setAppleEmail(e.target.value)} placeholder="name@example.com"/><button className="light-button" onClick={() => report("Адрес Apple ID сохранён только локально. Безопасная авторизация Apple ещё не подключена.")}>Сохранить адрес</button><small>Не отправляйте пароль или коды подтверждения в приложение.</small></section></div>}

      {page === "tools" && <div className="page-content secondary-page"><h1>Инструменты</h1><section className="panel form-panel"><h2>Установка IPA</h2><p>Выберите IPA-файл с компьютера. Для установки требуется подключённый iPhone и действительная подпись приложения.</p><div className="file-picker"><input readOnly value={ipa} placeholder="IPA-файл не выбран"/><button className="outline-button" onClick={chooseIpa}>Обзор…</button></div><button className="light-button" onClick={install} disabled={!ipa || busy || deviceState !== "connected" || requiresSigning}>Установить IPA</button></section><section className="panel form-panel"><h2>Журнал операций</h2><div className="history">{history.length ? history.map((line,i)=><p key={i}>{line}</p>) : <p>Операции пока не выполнялись.</p>}</div></section></div>}

      {page === "settings" && <div className="page-content secondary-page"><h1>Настройки</h1><section className="panel setting-panel"><div><h3>Версия приложения</h3><p>VoidGram Loader 0.5.0</p></div><span>0.5.0</span></section><section className="panel setting-panel"><div><h3>Обновление VoidGram</h3><p>{release ? `Последняя версия: ${release.version}` : "Информация о релизе недоступна"}</p></div><button className="outline-button" onClick={checkRelease}>Проверить обновления</button></section><section className="panel setting-panel"><div><h3>Журнал операций</h3><p>Последние действия приложения</p></div><button className="outline-button" onClick={() => setPage("tools")}>Открыть журнал</button></section></div>}
      <footer className="statusbar"><span className="green-dot"/>{notice}</footer>
    </main>
  </div>;
}
