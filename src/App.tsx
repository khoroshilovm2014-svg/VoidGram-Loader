import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export default function App() {
  const [device, setDevice] = useState("РЈСЃС‚СЂРѕР№СЃС‚РІРѕ РЅРµ РїСЂРѕРІРµСЂРµРЅРѕ");
  const [ipa, setIpa] = useState("");
  const [log, setLog] = useState("Р“РѕС‚РѕРІРѕ Рє СЂР°Р±РѕС‚Рµ");
  const [busy, setBusy] = useState(false);

  async function detect() {
    setBusy(true);
    try {
      const result = await invoke<string>("detect_devices");
      setDevice(result || "РЈСЃС‚СЂРѕР№СЃС‚РІРѕ РЅРµ РЅР°Р№РґРµРЅРѕ");
      setLog(result || "РџРѕРґРєР»СЋС‡РёС‚Рµ СѓСЃС‚СЂРѕР№СЃС‚РІРѕ Рё РїРѕРІС‚РѕСЂРёС‚Рµ РїСЂРѕРІРµСЂРєСѓ");
    } catch (e) {
      setLog(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function chooseIpa() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "IPA", extensions: ["ipa"] }]
      });
      if (typeof selected === "string") setIpa(selected);
    } catch (e) {
      setLog(String(e));
    }
  }

  async function install() {
    setBusy(true);
    try {
      setLog(await invoke<string>("install_ipa", { path: ipa }));
    } catch (e) {
      setLog(String(e));
    } finally {
      setBusy(false);
    }
  }

  return <main>
    <header>
      <div className="logo">V</div>
      <div><h1>VoidGram Loader</h1><small>IPA installer for iPhone and iPad</small></div>
      <span className="version">0.4.0</span>
    </header>

    <section className="panel">
      <h2>РЈСЃС‚СЂРѕР№СЃС‚РІРѕ</h2>
      <p>{device}</p>
      <button disabled={busy} onClick={detect}>РќР°Р№С‚Рё СѓСЃС‚СЂРѕР№СЃС‚РІРѕ</button>
    </section>

    <section className="panel">
      <h2>IPA-С„Р°Р№Р»</h2>
      <input readOnly value={ipa} placeholder="Р’С‹Р±РµСЂРёС‚Рµ IPA-С„Р°Р№Р»" />
      <button className="secondary" onClick={chooseIpa}>РћР±Р·РѕСЂ</button>
      <button disabled={!ipa || busy} onClick={install}>РЈСЃС‚Р°РЅРѕРІРёС‚СЊ</button>
    </section>

    <section className="panel">
      <h2>Р–СѓСЂРЅР°Р»</h2>
      <pre>{log}</pre>
    </section>
  </main>;
}