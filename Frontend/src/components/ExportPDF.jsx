import API from "../api/backend";

export default function ExportPDF() {
  const exportReport = async () => {
    const res = await API.get("/export/pdf", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    window.open(url);
  };

  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <button className="export-btn" onClick={exportReport}>Download Report PDF</button>
    </div>
  );
}
