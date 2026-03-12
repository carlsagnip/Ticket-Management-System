import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import SignatureCanvas from "react-signature-canvas";
import SearchableSelect from "./SearchableSelect";
import wacomstu540 from "../utils/WebHIDWacom";
import {
  FiPlus,
  FiX,
  FiTool,
  FiMapPin,
  FiUser,
  FiTrash2,
  FiInbox,
  FiAlertCircle,
  FiCheckCircle,
  FiMonitor,
  FiPrinter,
  FiCpu,
  FiHardDrive,
  FiCamera,
  FiTag,
  FiCalendar,
  FiEdit2,
  FiBox,
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiDownload,
} from "react-icons/fi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

const UNIT_TYPES = [
  { id: "computer", label: "Computer", icon: <FiCpu size={18} /> },
  { id: "laptop", label: "Laptop", icon: <FiHardDrive size={18} /> },
  { id: "printer", label: "Printer", icon: <FiPrinter size={18} /> },
  { id: "monitor", label: "Monitor", icon: <FiMonitor size={18} /> },
  { id: "scanner", label: "Scanner", icon: <FiCamera size={18} /> },
  { id: "projector", label: "Projector", icon: <FiTool size={18} /> },
  { id: "ups", label: "UPS", icon: <FiTool size={18} /> },
  { id: "keyboard", label: "Keyboard", icon: <FiTool size={18} /> },
  { id: "mouse", label: "Mouse", icon: <FiTool size={18} /> },
  { id: "avr", label: "AVR", icon: <FiTool size={18} /> },
  { id: "whitescreen", label: "White Screen", icon: <FiMonitor size={18} /> },
  { id: "others", label: "Others", icon: <FiTool size={18} /> },
];

const BARANGAYS = [
  "Atate",
  "Aulo",
  "Bagong Buhay",
  "Bo. Militar (Fort Magsaysay)",
  "Caballero (Poblacion)",
  "Caimito (Poblacion)",
  "Doña Josefa",
  "Ganaderia (Poblacion)",
  "Imelda Valley I",
  "Imelda Valley II",
  "Langka",
  "Malate (Poblacion)",
  "Maligaya",
  "Manacnac",
  "Mapaet/Mapait",
  "Marcos Village",
  "Popolon (Pagas)",
  "Santolan (Poblacion)",
  "Sapang Buho",
  "Singalat",
];

const EMPTY_FORM = {
  entityType: "office",
  officeId: "",
  barangay: "",
  category: "",
  name: "",
  receivedBy: "",
  officerInCharge: "",
  date: "",
  model: "",
  description: "",
  scanned_barcodes: [],
  signature: "",
};

function RepairBorrowed() {
  const [records, setRecords] = useState([]);
  const [offices, setOffices] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [selectedUnits, setSelectedUnits] = useState({});
  const sigPad = useRef(null);

  // Wacom STU-540 Integration State
  const [wacomDevice, setWacomDevice] = useState(null);
  const [isWacomConnected, setIsWacomConnected] = useState(false);
  const [wacomConnecting, setWacomConnecting] = useState(false);
  const wacomCtx = useRef(null);
  const wacomCanvasRef = useRef(null);
  const lastPoint = useRef(null);

  // '”€'”€ View / edit state '”€'”€
  const [viewRecord, setViewRecord] = useState(null);
  const [editData, setEditData] = useState({});
  const [editUnits, setEditUnits] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editDirty, setEditDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [statusConfirmModal, setStatusConfirmModal] = useState(null);

  // ── Return state ──
  const [returnRecord, setReturnRecord] = useState(null);
  const [returnForm, setReturnForm] = useState({
    officerInCharge: "",
    preInspection: "",
    actionsTaken: "",
    resultOutcome: "",
    handedOverTo: "",
  });
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState("");

  // ── Filter bar state ──
  const [rbSearch, setRbSearch] = useState("");
  const [rbOffice, setRbOffice] = useState("");
  const [rbCategory, setRbCategory] = useState("");
  const [rbUnit, setRbUnit] = useState("");
  const [rbStatus, setRbStatus] = useState("");
  const [showRbOfficeDD, setShowRbOfficeDD] = useState(false);
  const [showRbCategoryDD, setShowRbCategoryDD] = useState(false);
  const [showRbUnitDD, setShowRbUnitDD] = useState(false);
  const [showRbStatusDD, setShowRbStatusDD] = useState(false);

  // Barcode specific inputs
  const [addBarcode, setAddBarcode] = useState("");
  const [editBarcode, setEditBarcode] = useState("");
  // Already-borrowed barcode warnings
  const [borrowedWarnAdd, setBorrowedWarnAdd] = useState("");
  const [borrowedWarnEdit, setBorrowedWarnEdit] = useState("");
  // Map: barcode → { model, unitId } so removal stays in sync
  const [barcodeModelMap, setBarcodeModelMap] = useState({});

  useEffect(() => {
    fetchOffices();
    fetchOfficers();
    fetchRecords();
  }, []);

  // '”€'”€ Data fetching '”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€
  const fetchOffices = async () => {
    try {
      const { data, error } = await supabase
        .from("offices")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      setOffices(data || []);
    } catch (err) {
      console.error("Error fetching offices:", err);
    }
  };

  const fetchOfficers = async () => {
    try {
      const { data, error } = await supabase
        .from("officers")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      setOfficers(data || []);
    } catch (err) {
      console.error("Error fetching officers:", err);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("repair_borrowed")
        .select("*, offices(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error("Error fetching repair/borrowed records:", err);
    } finally {
      setLoading(false);
    }
  };

  // '”€'”€ Unit type button handler '”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€
  const handleUnitClick = (unitId) => {
    setSelectedUnits((prev) => ({
      ...prev,
      [unitId]: (prev[unitId] || 0) + 1,
    }));
  };

  const handleUnitRemove = (unitId) => {
    setSelectedUnits((prev) => {
      const next = { ...prev };
      if (next[unitId] > 1) {
        next[unitId] -= 1;
      } else {
        delete next[unitId];
      }
      return next;
    });
  };

  // '”€'”€ Form helpers '”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const errs = {};
    if (formData.entityType === "office" && !formData.officeId)
      errs.officeId = "Please select an office";
    if (formData.entityType === "barangay" && !formData.barangay)
      errs.barangay = "Please select a barangay";
    if (!formData.category) errs.category = "Please select a category";
    if (Object.keys(selectedUnits).length === 0)
      errs.units = "Please select at least one unit type";
    if (formData.category === "Borrowed") {
      if (isWacomConnected) {
        // Simple check for Wacom: if they started drawing, they're good (we clear when we open)
        // A real check might involve inspecting if the canvas is completely blank
      } else if (sigPad.current && sigPad.current.isEmpty()) {
        errs.signature = "Signature is required for borrowed items";
      }
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError("");

    try {
      // Build units array: [{ type, quantity }]
      const units = Object.entries(selectedUnits).map(([type, quantity]) => ({
        type,
        quantity,
      }));

      let signatureData = null;
      if (formData.category === "Borrowed") {
        if (isWacomConnected && wacomCanvasRef.current) {
          // Check if canvas is actually drawn on (simple approach: it might be blank, but assuming user writes if connected)
          signatureData = wacomCanvasRef.current.toDataURL("image/png");
        } else if (sigPad.current && !sigPad.current.isEmpty()) {
          signatureData = sigPad.current
            .getTrimmedCanvas()
            .toDataURL("image/png");
        }
      }

      const { error: insertError } = await supabase
        .from("repair_borrowed")
        .insert([
          {
            entity_type: formData.entityType,
            office_id:
              formData.entityType === "office"
                ? formData.officeId || null
                : null,
            barangay:
              formData.entityType === "barangay"
                ? formData.barangay || null
                : null,
            category: formData.category || null,
            name: formData.name.trim() || null,
            received_by: formData.receivedBy?.trim() || null,
            officer_in_charge: formData.officerInCharge?.trim() || null,
            units,
            date: formData.date || new Date().toISOString(),
            model: formData.model.trim() || null,
            description: formData.description.trim() || null,
            status: formData.category === "Borrowed" ? "Borrowed" : "Repairing",
            scanned_barcodes: formData.scanned_barcodes || [],
            signature: signatureData,
          },
        ]);

      if (insertError) throw insertError;

      // Sync with inventory tracking
      if (formData.scanned_barcodes && formData.scanned_barcodes.length > 0) {
        await supabase
          .from("inventory_items")
          .update({
            status: formData.category === "Borrowed" ? "Borrowed" : "Repairing",
          })
          .in("barcode", formData.scanned_barcodes);
      }

      closeModal();
      fetchRecords();
    } catch (err) {
      console.error("Error saving record:", err);
      setError("Failed to save record. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !confirm(
        "Delete this record? This cannot be undone.\n\nIf this is a Borrowed record, all borrowed items will be marked Available again.",
      )
    )
      return;
    try {
      // Find the record in local state so we have its barcodes & category
      const record = records.find((r) => r.id === id);

      // If it's a Borrowed record with scanned barcodes, reset them to Available
      if (
        record?.category === "Borrowed" &&
        Array.isArray(record.scanned_barcodes) &&
        record.scanned_barcodes.length > 0
      ) {
        const { error: updateErr } = await supabase
          .from("inventory_items")
          .update({ status: "Available" })
          .in("barcode", record.scanned_barcodes);

        if (updateErr) {
          console.error("Error resetting inventory status:", updateErr);
          // Non-fatal — still proceed with delete
        }
      }

      const { error: delErr } = await supabase
        .from("repair_borrowed")
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;
      fetchRecords();
    } catch (err) {
      console.error("Error deleting record:", err);
    }
  };

  const handleWacomConnect = async () => {
    try {
      setWacomConnecting(true);
      let device = new wacomstu540();
      if (!device) {
        alert(
          "WebHID is not supported in this browser. Please use Chrome or Edge.",
        );
        setWacomConnecting(false);
        return;
      }

      const res = await device.connect();
      if (res) {
        setWacomDevice(device);
        setIsWacomConnected(true);

        await device.setInking(true);
        await device.clearScreen();

        device.onPenData((data) => {
          // Lazy init canvas ctx since JSX relies on isWacomConnected state to render it
          if (!wacomCtx.current && wacomCanvasRef.current) {
            const ctx = wacomCanvasRef.current.getContext("2d");
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            wacomCtx.current = ctx;
          }

          if (!wacomCtx.current || !wacomCanvasRef.current) return;
          const ctx = wacomCtx.current;

          if (data.sw || data.press > 0) {
            // Pen is touching
            if (!lastPoint.current) {
              lastPoint.current = { x: data.cx, y: data.cy };
            } else {
              ctx.beginPath();
              ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
              ctx.lineTo(data.cx, data.cy);
              // Canvas is 800x480 but scaled down in the UI, base thickness needs to be higher
              ctx.lineWidth = 4 + data.press * 6;
              ctx.strokeStyle = "black";
              ctx.stroke();
              lastPoint.current = { x: data.cx, y: data.cy };
            }
          } else {
            // Pen lifted
            lastPoint.current = null;
          }
        });
      } else {
        alert(
          "Could not connect to Wacom STU-540. Please ensure it is plugged in.",
        );
      }
    } catch (e) {
      console.error(e);
      alert("Error connecting to Wacom device: " + e.message);
    } finally {
      setWacomConnecting(false);
    }
  };

  const clearWacom = async () => {
    if (wacomDevice && isWacomConnected) {
      await wacomDevice.clearScreen();
    }
    if (wacomCanvasRef.current && wacomCtx.current) {
      wacomCtx.current.clearRect(
        0,
        0,
        wacomCanvasRef.current.width,
        wacomCanvasRef.current.height,
      );
    }
  };

  const openModal = () => {
    setFormData(EMPTY_FORM);
    setSelectedUnits({});
    setFormErrors({});
    setError("");
    setBarcodeModelMap({});
    setShowModal(true);

    // Clear device screen if connected
    if (isWacomConnected && wacomDevice) {
      wacomDevice.clearScreen().catch((e) => console.error(e));
      if (wacomCanvasRef.current && wacomCtx.current) {
        wacomCtx.current.clearRect(
          0,
          0,
          wacomCanvasRef.current.width,
          wacomCanvasRef.current.height,
        );
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData(EMPTY_FORM);
    setSelectedUnits({});
    setFormErrors({});
    setError("");
    setBarcodeModelMap({});
  };

  // '”€'”€ View / Edit handlers '”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€
  const openViewModal = (rec) => {
    setViewRecord(rec);
    setEditData({
      entityType: rec.entity_type || "office",
      officeId: rec.office_id || "",
      barangay: rec.barangay || "",
      category: rec.category || "",
      name: rec.name || "",
      receivedBy: rec.received_by || "",
      officerInCharge: rec.officer_in_charge || "",
      date: rec.date || "",
      model: rec.model || "",
      description: rec.description || "",
      status: rec.status || "",
      scanned_barcodes: rec.scanned_barcodes || [],
      signature: rec.signature || "",
    });
    // Convert units array to {id: qty} map
    const unitMap = {};
    (rec.units || []).forEach((u) => {
      unitMap[u.type] = u.quantity;
    });
    setEditUnits(unitMap);
    setEditError("");
  };

  const closeViewModal = () => {
    setViewRecord(null);
    setEditData({});
    setEditUnits({});
    setEditError("");
    setEditDirty(false);
    setLastSaved(null);
    setStatusConfirmModal(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
    setEditDirty(true);
    setLastSaved(null);
  };

  const handleEditUnitClick = (unitId) => {
    setEditUnits((prev) => ({ ...prev, [unitId]: (prev[unitId] || 0) + 1 }));
    setEditDirty(true);
    setLastSaved(null);
  };

  const handleEditUnitRemove = (unitId) => {
    setEditUnits((prev) => {
      const next = { ...prev };
      if (next[unitId] > 1) next[unitId] -= 1;
      else delete next[unitId];
      return next;
    });
    setEditDirty(true);
    setLastSaved(null);
  };

  // '”€'”€ Return handlers '”€'”€
  const openReturnModal = (rec) => {
    setReturnRecord(rec);
    setReturnForm({
      officerInCharge: "",
      preInspection: "",
      actionsTaken: "",
      resultOutcome: "",
      handedOverTo: "",
    });
    setReturnError("");
  };

  const closeReturnModal = () => {
    setReturnRecord(null);
    setReturnForm({
      officerInCharge: "",
      preInspection: "",
      actionsTaken: "",
      resultOutcome: "",
      handedOverTo: "",
    });
    setReturnError("");
  };

  const handleReturnChange = (e) => {
    const { name, value } = e.target;
    setReturnForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    setReturnSubmitting(true);
    setReturnError("");

    try {
      const { error: updErr } = await supabase
        .from("repair_borrowed")
        .update({
          status: "Returned",
          returned_date: new Date().toISOString(),
          return_officer_in_charge: returnForm.officerInCharge.trim() || null,
          pre_inspection: returnForm.preInspection.trim() || null,
          actions_taken: returnForm.actionsTaken.trim() || null,
          result_outcome: returnForm.resultOutcome.trim() || null,
          handed_over_to: returnForm.handedOverTo.trim() || null,
        })
        .eq("id", returnRecord.id);

      if (updErr) throw updErr;

      // Update inventory items status to Available
      if (
        returnRecord.scanned_barcodes &&
        returnRecord.scanned_barcodes.length > 0
      ) {
        await supabase
          .from("inventory_items")
          .update({ status: "Available" })
          .in("barcode", returnRecord.scanned_barcodes);
      }

      closeReturnModal();
      fetchRecords();
    } catch (err) {
      console.error("Return error:", err);
      setReturnError("Failed to process return. Please check your connection.");
    } finally {
      setReturnSubmitting(false);
    }
  };

  // '”€'”€ Barcode handlers '”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€
  const handleAddBarcodeKeyDown = async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = addBarcode.trim();
      setBorrowedWarnAdd("");
      if (code && !formData.scanned_barcodes.includes(code)) {
        if (formData.category === "Borrowed") {
          try {
            const { data, error } = await supabase
              .from("inventory_items")
              .select("model, category, status")
              .eq("barcode", code)
              .maybeSingle();

            if (error) console.error("Supabase fetch error (Add):", error);

            // '”€'”€ Block if already borrowed '”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€
            if (data && data.status === "Borrowed") {
              const modelName = data.model
                ? `"${data.model}"`
                : `barcode ${code}`;
              setBorrowedWarnAdd(
                `${modelName} is already borrowed and has not been returned yet.`,
              );
              setAddBarcode("");
              return;
            }

            if (data && (data.model || data.category)) {
              let matchedUnitId = null;
              // Append model
              if (data.model) {
                setFormData((p) => ({
                  ...p,
                  model: p.model ? `${p.model}, ${data.model}` : data.model,
                }));
              }
              // Increment unit count
              const categoryName = data.category || "";
              const matchedUnit =
                UNIT_TYPES.find(
                  (u) => u.label.toLowerCase() === categoryName.toLowerCase(),
                ) || UNIT_TYPES.find((u) => u.id === "others");

              if (matchedUnit) {
                matchedUnitId = matchedUnit.id;
                setSelectedUnits((prev) => ({
                  ...prev,
                  [matchedUnitId]: Number(prev[matchedUnitId] || 0) + 1,
                }));
                if (formErrors.units)
                  setFormErrors((p) => ({ ...p, units: "" }));
              }
              // Record mapping so removal can undo both model text + unit
              setBarcodeModelMap((prev) => ({
                ...prev,
                [code]: { model: data.model || null, unitId: matchedUnitId },
              }));
            }
          } catch (err) {
            console.error("Error auto-fetching item:", err);
          }
        }
        setFormData((p) => ({
          ...p,
          scanned_barcodes: [...(p.scanned_barcodes || []), code],
        }));
      }
      setAddBarcode("");
    }
  };

  const handleRemoveAddBarcode = (code) => {
    const entry = barcodeModelMap[code];
    setFormData((p) => {
      let newModel = p.model;
      if (entry?.model) {
        // Remove the exact model fragment (handles both middle and end positions)
        newModel = p.model
          .split(", ")
          .filter((m) => m !== entry.model)
          .join(", ");
      }
      return {
        ...p,
        scanned_barcodes: p.scanned_barcodes.filter((b) => b !== code),
        model: newModel,
      };
    });
    // Decrement the unit count that was auto-added for this barcode
    if (entry?.unitId) {
      setSelectedUnits((prev) => {
        const next = { ...prev };
        if ((next[entry.unitId] || 0) > 1) {
          next[entry.unitId] -= 1;
        } else {
          delete next[entry.unitId];
        }
        return next;
      });
    }
    // Clean up the map entry
    setBarcodeModelMap((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
  };

  const handleEditBarcodeKeyDown = async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = editBarcode.trim();
      setBorrowedWarnEdit("");
      if (code && !(editData.scanned_barcodes || []).includes(code)) {
        if (editData.category === "Borrowed") {
          try {
            const { data, error } = await supabase
              .from("inventory_items")
              .select("model, category, status")
              .eq("barcode", code)
              .maybeSingle();

            if (error) console.error("Supabase fetch error (Edit):", error);

            // '”€'”€ Block if already borrowed '”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€
            if (data && data.status === "Borrowed") {
              const modelName = data.model
                ? `"${data.model}"`
                : `barcode ${code}`;
              setBorrowedWarnEdit(
                `${modelName} is already borrowed and has not been returned yet.`,
              );
              setEditBarcode("");
              return;
            }

            if (data && (data.model || data.category)) {
              if (data.model) {
                setEditData((p) => ({
                  ...p,
                  model: p.model ? `${p.model}, ${data.model}` : data.model,
                }));
              }
              const categoryName = data.category || "";
              const matchedUnit =
                UNIT_TYPES.find(
                  (u) => u.label.toLowerCase() === categoryName.toLowerCase(),
                ) || UNIT_TYPES.find((u) => u.id === "others");

              if (matchedUnit) {
                const unitId = matchedUnit.id;
                setEditUnits((prev) => ({
                  ...prev,
                  [unitId]: Number(prev[unitId] || 0) + 1,
                }));
              }
            }
          } catch (err) {
            console.error("Error auto-fetching item:", err);
          }
        }
        setEditData((p) => ({
          ...p,
          scanned_barcodes: [...(p.scanned_barcodes || []), code],
        }));
        setEditDirty(true);
        setLastSaved(null);
      }
      setEditBarcode("");
    }
  };

  const handleRemoveEditBarcode = (code) => {
    setEditData((p) => ({
      ...p,
      scanned_barcodes: (p.scanned_barcodes || []).filter((b) => b !== code),
    }));
    setEditDirty(true);
    setLastSaved(null);
  };

  // Auto-Save effect
  useEffect(() => {
    if (!viewRecord || !editDirty) return;

    const saveChanges = async () => {
      setEditSaving(true);
      setEditError("");
      try {
        const units = Object.entries(editUnits).map(([type, quantity]) => ({
          type,
          quantity,
        }));
        const { error: updErr } = await supabase
          .from("repair_borrowed")
          .update({
            entity_type: editData.entityType || "office",
            office_id:
              editData.entityType === "office"
                ? editData.officeId || null
                : null,
            barangay:
              editData.entityType === "barangay"
                ? editData.barangay || null
                : null,
            category: editData.category || null,
            name: editData.name.trim() || null,
            received_by: editData.receivedBy?.trim() || null,
            officer_in_charge: editData.officerInCharge?.trim() || null,
            date: editData.date || null,
            model: editData.model.trim() || null,
            description: editData.description.trim() || null,
            status: editData.status || null,
            returned_date:
              editData.status === "Returned"
                ? viewRecord.returned_date || new Date().toISOString()
                : null,
            units,
            scanned_barcodes: editData.scanned_barcodes || [],
          })
          .eq("id", viewRecord.id);

        if (updErr) throw updErr;

        // Sync with inventory tracking
        const removedBarcodes = (viewRecord.scanned_barcodes || []).filter(
          (b) => !(editData.scanned_barcodes || []).includes(b),
        );

        // 1. Set removed items back to Available
        if (removedBarcodes.length > 0) {
          await supabase
            .from("inventory_items")
            .update({ status: "Available" })
            .in("barcode", removedBarcodes);
        }

        // 2. Set current items to the appropriate status
        if (editData.scanned_barcodes && editData.scanned_barcodes.length > 0) {
          const newStatus =
            editData.status === "Returned"
              ? "Available"
              : editData.category === "Borrowed"
                ? "Borrowed"
                : "Repairing";
          await supabase
            .from("inventory_items")
            .update({ status: newStatus })
            .in("barcode", editData.scanned_barcodes);
        }

        // Background refresh table
        fetchRecords();
        setEditDirty(false);
        setLastSaved(new Date());
      } catch (err) {
        console.error("Auto-Update error:", err);
        setEditError("Failed to auto-save. Please check your connection.");
      } finally {
        setEditSaving(false);
      }
    };

    const timer = setTimeout(() => {
      saveChanges();
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [editData, editUnits, editDirty, viewRecord]);

  // '”€'”€ PDF Generation '”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€
  const generateContract = () => {
    if (!viewRecord) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PALAYAN ICT DIVISION", pageWidth / 2, yPos, { align: "center" });
    yPos += 8;

    doc.setFontSize(14);
    doc.text("EQUIPMENT BORROWING CONTRACT", pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 15;

    // Borrower Information
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    const borrowerName = editData.name || "N/A";
    let entityName = "N/A";
    if (editData.entityType === "barangay") {
      entityName = editData.barangay || "N/A";
    } else {
      entityName =
        offices.find((o) => o.id === editData.officeId)?.name || "N/A";
    }
    const borrowDate = editData.date
      ? format(new Date(editData.date), "MMMM d, yyyy h:mm a")
      : "N/A";

    doc.text(`Borrower Name: ${borrowerName}`, 20, yPos);
    yPos += 8;
    doc.text(`Office/Barangay: ${entityName}`, 20, yPos);
    yPos += 8;
    doc.text(`Date Borrowed: ${borrowDate}`, 20, yPos);
    yPos += 15;

    // Equipment Details Table
    doc.setFont("helvetica", "bold");
    doc.text("Equipment Details:", 20, yPos);
    yPos += 5;

    const tableData = [];
    const modelStr = editData.model || "N/A";

    if (editData.units && editData.units.length > 0) {
      editData.units.forEach((u) => {
        tableData.push([modelStr, unitLabel(u.type), u.quantity]);
      });
    } else if (Object.keys(editUnits).length > 0) {
      Object.entries(editUnits).forEach(([id, qty]) => {
        tableData.push([modelStr, unitLabel(id), qty]);
      });
    } else {
      tableData.push([modelStr, "N/A", "-"]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [["Model Name", "Unit Type", "Quantity"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
      margin: { left: 20, right: 20 },
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Terms and Conditions
    doc.setFont("helvetica", "bold");
    doc.text("Terms and Conditions:", 20, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const terms = [
      "1. The borrower acknowledges receipt of the above-listed equipment in good condition.",
      "2. The borrower shall be held liable for any damage, loss, or theft of the equipment while in their possession.",
      "3. In case of damage or loss, the borrower or their respective office shall be responsible for the repair or replacement costs.",
      "4. The equipment must be returned on or before the agreed return date, or reasonable time if no date is specified.",
      "5. The equipment shall only be used for official government/office purposes.",
    ];

    terms.forEach((term) => {
      const splitTerm = doc.splitTextToSize(term, pageWidth - 40);
      doc.text(splitTerm, 20, yPos);
      yPos += splitTerm.length * 5 + 3;
    });

    yPos += 10;

    // Signatures
    doc.setFontSize(11);
    doc.text("Conforme:", 20, yPos);

    if (editData.signature) {
      // Add signature image
      try {
        doc.addImage(editData.signature, "PNG", 20, yPos + 5, 50, 25);
      } catch (e) {
        console.error("Could not add signature image to PDF", e);
      }
    }

    yPos += 35;
    doc.line(20, yPos, 80, yPos);
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text(
      borrowerName !== "N/A" ? borrowerName : "Signature over Printed Name",
      20,
      yPos,
    );
    doc.setFont("helvetica", "normal");
    yPos += 5;
    doc.text("Borrower", 20, yPos);

    // Save PDF
    const safeName = borrowerName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    doc.save(`Equipment_Contract_${safeName || "borrower"}.pdf`);
  };

  // '”€'”€ Helpers '”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€
  const formatDate = (str) =>
    new Date(str).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const unitLabel = (unitId) =>
    UNIT_TYPES.find((u) => u.id === unitId)?.label ?? unitId;

  // '”€'”€ Computed statistics '”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€
  const borrowedRecords = records.filter((r) => r.category === "Borrowed");
  const repairRecords = records.filter((r) => r.category === "Repair");

  const borrowStats = {
    total: borrowedRecords.length,
    active: borrowedRecords.filter((r) => r.status !== "Returned").length,
    returned: borrowedRecords.filter((r) => r.status === "Returned").length,
  };

  const repairStats = {
    total: repairRecords.length,
    repairing: repairRecords.filter((r) => r.status !== "Returned").length,
    returned: repairRecords.filter((r) => r.status === "Returned").length,
  };
  // -- Filtered records --
  const filteredRecords = records.filter((rec) => {
    if (rbSearch) {
      const q = rbSearch.toLowerCase();
      const matchOffice = rec.offices?.name?.toLowerCase().includes(q);
      const matchModel = rec.model?.toLowerCase().includes(q);
      const matchName = rec.name?.toLowerCase().includes(q);
      if (!matchOffice && !matchModel && !matchName) return false;
    }
    if (rbOffice && rec.office_id !== rbOffice) return false;
    if (rbCategory && rec.category !== rbCategory) return false;
    if (rbUnit && !(rec.units || []).some((u) => u.type === rbUnit))
      return false;
    if (rbStatus && rec.status !== rbStatus) return false;
    return true;
  });
  const rbHasFilters = rbSearch || rbOffice || rbCategory || rbUnit || rbStatus;
  const clearRbFilters = () => {
    setRbSearch("");
    setRbOffice("");
    setRbCategory("");
    setRbUnit("");
    setRbStatus("");
  };

  // '”€'”€ Render '”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€'”€
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* ── Page header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          marginBottom: "1.5rem",
          flexShrink: 0,
        }}
      >
        <button className="btn btn-primary" onClick={openModal}>
          <FiPlus size={18} />
          Add Record
        </button>
      </div>

      {/* '”€'”€ Statistics '”€'”€ */}
      {!loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBottom: "1.5rem",
            flexShrink: 0,
          }}
        >
          {/* Borrowed stats */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid #bfdbfe",
              borderRadius: "var(--radius-lg)",
              padding: "1rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.875rem",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#2563eb",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontWeight: "700",
                  fontSize: "0.875rem",
                  color: "#2563eb",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Borrowed
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.75rem",
              }}
            >
              {[
                {
                  label: "Total Borrowed",
                  value: borrowStats.total,
                  bg: "#eff6ff",
                  color: "#1e40af",
                },
                {
                  label: "Borrowed",
                  value: borrowStats.active,
                  bg: "#dbeafe",
                  color: "#2563eb",
                },
                {
                  label: "Returned",
                  value: borrowStats.returned,
                  bg: "#d1fae5",
                  color: "#065f46",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: s.bg,
                    borderRadius: "var(--radius-md)",
                    padding: "0.75rem",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "800",
                      color: s.color,
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: "600",
                      color: s.color,
                      marginTop: "0.25rem",
                      opacity: 0.8,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Repair stats */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid #ddd6fe",
              borderRadius: "var(--radius-lg)",
              padding: "1rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.875rem",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#7c3aed",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontWeight: "700",
                  fontSize: "0.875rem",
                  color: "#7c3aed",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Repair
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.75rem",
              }}
            >
              {[
                {
                  label: "Total Repair",
                  value: repairStats.total,
                  bg: "#f5f3ff",
                  color: "#6d28d9",
                },
                {
                  label: "Repairing",
                  value: repairStats.repairing,
                  bg: "#ede9fe",
                  color: "#7c3aed",
                },
                {
                  label: "Returned",
                  value: repairStats.returned,
                  bg: "#d1fae5",
                  color: "#065f46",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: s.bg,
                    borderRadius: "var(--radius-md)",
                    padding: "0.75rem",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "800",
                      color: s.color,
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: "600",
                      color: s.color,
                      marginTop: "0.25rem",
                      opacity: 0.8,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* action-bar */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "center",
          flexShrink: 0,
          marginBottom: "0.75rem",
        }}
      >
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <FiSearch
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              width: "16px",
              height: "16px",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search by office, model or name..."
            value={rbSearch}
            onChange={(e) => setRbSearch(e.target.value)}
            style={{ paddingLeft: "2.5rem", margin: 0, height: "38px" }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            className="filter-pill"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "default",
            }}
          >
            <FiFilter size={14} /> All ({filteredRecords.length})
          </button>
          {/* Office */}
          <div style={{ position: "relative" }}>
            <button
              className={`filter-pill ${rbOffice ? "active" : ""}`}
              onClick={() => {
                setShowRbOfficeDD(!showRbOfficeDD);
                setShowRbCategoryDD(false);
                setShowRbUnitDD(false);
                setShowRbStatusDD(false);
              }}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {rbOffice
                ? offices.find((o) => o.id === rbOffice)?.name || rbOffice
                : "All Offices"}
              <FiChevronDown size={14} />
            </button>
            {showRbOfficeDD && (
              <>
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "0.5rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 50,
                    minWidth: "220px",
                    maxHeight: "280px",
                    overflow: "auto",
                  }}
                >
                  {["", ...offices.map((o) => o.id)].map((id) => {
                    const label = id
                      ? (offices.find((o) => o.id === id)?.name ?? id)
                      : "All Offices";
                    return (
                      <button
                        key={id || "__all__"}
                        onClick={() => {
                          setRbOffice(id);
                          setShowRbOfficeDD(false);
                        }}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "none",
                          background:
                            rbOffice === id ? "var(--primary)" : "transparent",
                          color:
                            rbOffice === id ? "white" : "var(--text-primary)",
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                        }}
                        onMouseEnter={(e) => {
                          if (rbOffice !== id)
                            e.currentTarget.style.background =
                              "var(--bg-elevated)";
                        }}
                        onMouseLeave={(e) => {
                          if (rbOffice !== id)
                            e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                  onClick={() => setShowRbOfficeDD(false)}
                />
              </>
            )}
          </div>
          {/* Category */}
          <div style={{ position: "relative" }}>
            <button
              className={`filter-pill ${rbCategory ? "active" : ""}`}
              onClick={() => {
                setShowRbCategoryDD(!showRbCategoryDD);
                setShowRbOfficeDD(false);
                setShowRbUnitDD(false);
                setShowRbStatusDD(false);
              }}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {rbCategory || "All Categories"}
              <FiChevronDown size={14} />
            </button>
            {showRbCategoryDD && (
              <>
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "0.5rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 50,
                    minWidth: "160px",
                    overflow: "hidden",
                  }}
                >
                  {["", ...["Borrowed", "Repair"]].map((c) => (
                    <button
                      key={c || "__all__"}
                      onClick={() => {
                        setRbCategory(c);
                        setShowRbCategoryDD(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "none",
                        background:
                          rbCategory === c ? "var(--primary)" : "transparent",
                        color:
                          rbCategory === c ? "white" : "var(--text-primary)",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                      }}
                      onMouseEnter={(e) => {
                        if (rbCategory !== c)
                          e.currentTarget.style.background =
                            "var(--bg-elevated)";
                      }}
                      onMouseLeave={(e) => {
                        if (rbCategory !== c)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {c || "All Categories"}
                    </button>
                  ))}
                </div>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                  onClick={() => setShowRbCategoryDD(false)}
                />
              </>
            )}
          </div>
          {/* Units */}
          <div style={{ position: "relative" }}>
            <button
              className={`filter-pill ${rbUnit ? "active" : ""}`}
              onClick={() => {
                setShowRbUnitDD(!showRbUnitDD);
                setShowRbOfficeDD(false);
                setShowRbCategoryDD(false);
                setShowRbStatusDD(false);
              }}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {rbUnit
                ? (UNIT_TYPES.find((u) => u.id === rbUnit)?.label ?? rbUnit)
                : "All Units"}
              <FiChevronDown size={14} />
            </button>
            {showRbUnitDD && (
              <>
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "0.5rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 50,
                    minWidth: "160px",
                    maxHeight: "280px",
                    overflow: "auto",
                  }}
                >
                  {["", ...UNIT_TYPES.map((u) => u.id)].map((id) => {
                    const label = id
                      ? (UNIT_TYPES.find((u) => u.id === id)?.label ?? id)
                      : "All Units";
                    return (
                      <button
                        key={id || "__all__"}
                        onClick={() => {
                          setRbUnit(id);
                          setShowRbUnitDD(false);
                        }}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "none",
                          background:
                            rbUnit === id ? "var(--primary)" : "transparent",
                          color:
                            rbUnit === id ? "white" : "var(--text-primary)",
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                        }}
                        onMouseEnter={(e) => {
                          if (rbUnit !== id)
                            e.currentTarget.style.background =
                              "var(--bg-elevated)";
                        }}
                        onMouseLeave={(e) => {
                          if (rbUnit !== id)
                            e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                  onClick={() => setShowRbUnitDD(false)}
                />
              </>
            )}
          </div>
          {/* Status */}
          <div style={{ position: "relative" }}>
            <button
              className={`filter-pill ${rbStatus ? "active" : ""}`}
              onClick={() => {
                setShowRbStatusDD(!showRbStatusDD);
                setShowRbOfficeDD(false);
                setShowRbCategoryDD(false);
                setShowRbUnitDD(false);
              }}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {rbStatus || "All Statuses"}
              <FiChevronDown size={14} />
            </button>
            {showRbStatusDD && (
              <>
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "0.5rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 50,
                    minWidth: "160px",
                    overflow: "hidden",
                  }}
                >
                  {["", ...["Borrowed", "Repairing", "Returned"]].map((s) => (
                    <button
                      key={s || "__all__"}
                      onClick={() => {
                        setRbStatus(s);
                        setShowRbStatusDD(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "none",
                        background:
                          rbStatus === s ? "var(--primary)" : "transparent",
                        color: rbStatus === s ? "white" : "var(--text-primary)",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                      }}
                      onMouseEnter={(e) => {
                        if (rbStatus !== s)
                          e.currentTarget.style.background =
                            "var(--bg-elevated)";
                      }}
                      onMouseLeave={(e) => {
                        if (rbStatus !== s)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {s || "All Statuses"}
                    </button>
                  ))}
                </div>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                  onClick={() => setShowRbStatusDD(false)}
                />
              </>
            )}
          </div>
          {rbHasFilters && (
            <button
              className="filter-pill"
              onClick={clearRbFilters}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <FiX size={14} /> Clear
            </button>
          )}
        </div>
      </div>
      {/* '”€'”€ Records list '”€'”€ */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            gap: "1rem",
          }}
        >
          <FiInbox size={56} style={{ opacity: 0.4 }} />
          <p style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>
            {rbHasFilters
              ? "No records match your filters."
              : "No records yet."}
          </p>
          <p style={{ margin: 0, fontSize: "0.875rem" }}>
            Click <strong>Add Record</strong> to log your first entry.
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  <th>#</th>
                  <th>Office</th>
                  <th>Model</th>
                  <th>Category</th>
                  <th>Name</th>
                  <th>Units</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Returned</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec, idx) => (
                  <tr
                    key={rec.id}
                    onClick={() => openViewModal(rec)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-elevated)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "")
                    }
                  >
                    <td
                      style={{ color: "var(--text-muted)", fontWeight: "600" }}
                    >
                      {idx + 1}
                    </td>
                    <td>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                        }}
                      >
                        <FiMapPin
                          size={14}
                          style={{ color: "var(--primary)", flexShrink: 0 }}
                        />
                        {rec.entity_type === "barangay"
                          ? rec.barangay || (
                              <em style={{ color: "var(--text-muted)" }}>—</em>
                            )
                          : (rec.offices?.name ?? (
                              <em style={{ color: "var(--text-muted)" }}>—</em>
                            ))}
                      </span>
                    </td>
                    <td>
                      {rec.model || (
                        <em style={{ color: "var(--text-muted)" }}>—</em>
                      )}
                    </td>
                    <td>
                      {rec.category ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "0.2rem 0.65rem",
                            borderRadius: "var(--radius-md)",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            background:
                              rec.category === "Borrowed"
                                ? "#eff6ff"
                                : "#f5f3ff",
                            color:
                              rec.category === "Borrowed"
                                ? "#2563eb"
                                : "#7c3aed",
                            border: `1px solid ${rec.category === "Borrowed" ? "#bfdbfe" : "#ddd6fe"}`,
                          }}
                        >
                          {rec.category}
                        </span>
                      ) : (
                        <em style={{ color: "var(--text-muted)" }}>—</em>
                      )}
                    </td>
                    <td>
                      {rec.name ? (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.375rem",
                          }}
                        >
                          <FiUser
                            size={14}
                            style={{
                              color: "var(--text-muted)",
                              flexShrink: 0,
                            }}
                          />
                          {rec.name}
                        </span>
                      ) : (
                        <em style={{ color: "var(--text-muted)" }}>—</em>
                      )}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.375rem",
                        }}
                      >
                        {(rec.units || []).map((u) => (
                          <span
                            key={u.type}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              background: "#eff6ff",
                              color: "var(--primary)",
                              border: "1px solid #bfdbfe",
                              borderRadius: "var(--radius-md)",
                              padding: "0.2rem 0.6rem",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                            }}
                          >
                            {unitLabel(u.type)}
                            {u.quantity > 1 && (
                              <span
                                style={{
                                  background: "var(--primary)",
                                  color: "white",
                                  borderRadius: "9999px",
                                  padding: "0 0.35rem",
                                  fontSize: "0.65rem",
                                  fontWeight: "700",
                                  lineHeight: "1.4",
                                }}
                              >
                                ×{u.quantity}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {rec.status ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "0.2rem 0.65rem",
                            borderRadius: "var(--radius-md)",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            background:
                              rec.status === "Returned" ? "#d1fae5" : "#fef3c7",
                            color:
                              rec.status === "Returned" ? "#065f46" : "#92400e",
                            border: `1px solid ${rec.status === "Returned" ? "#6ee7b7" : "#fcd34d"}`,
                          }}
                        >
                          {rec.status}
                        </span>
                      ) : (
                        <em style={{ color: "var(--text-muted)" }}>—</em>
                      )}
                    </td>
                    <td
                      style={{
                        whiteSpace: "nowrap",
                        color: "var(--text-secondary)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {rec.date ? (
                        new Date(rec.date).toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      ) : (
                        <em style={{ color: "var(--text-muted)" }}>—</em>
                      )}
                    </td>
                    <td
                      style={{
                        whiteSpace: "nowrap",
                        color: "var(--text-secondary)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {rec.status === "Returned" && rec.returned_date ? (
                        new Date(rec.returned_date).toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      ) : (
                        <em style={{ color: "var(--text-muted)" }}>—</em>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: "0.5rem",
                        }}
                      >
                        {rec.status !== "Returned" && (
                          <button
                            className="btn btn-small"
                            style={{
                              background: "#10b981",
                              color: "white",
                              border: "none",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openReturnModal(rec);
                            }}
                          >
                            <FiCheckCircle size={14} />
                            Return
                          </button>
                        )}
                        <button
                          className="btn btn-small btn-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(rec.id);
                          }}
                        >
                          <FiTrash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* '”€'”€ Add Record Modal '”€'”€ */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal"
            style={{
              maxWidth: "680px",
              maxHeight: formData.category ? "92vh" : "480px",
              transition: "max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h3
                className="modal-title"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <FiTool style={{ color: "var(--primary)" }} />
                Add Repair / Borrowed Record
              </h3>
              <button
                className="btn btn-icon btn-ghost"
                onClick={closeModal}
                style={{ width: "36px", height: "36px" }}
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {error && (
                <div
                  className="alert alert-error"
                  style={{ marginBottom: "1rem" }}
                >
                  <FiAlertCircle />
                  {error}
                </div>
              )}

              <form id="rb-form" onSubmit={handleSubmit}>
                {/* Entity Type Selection */}
                <div className="form-group">
                  <label
                    className="form-label"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FiMapPin size={15} />
                    Entity Type
                    <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    {["office", "barangay"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setFormData((p) => ({ ...p, entityType: type }));
                        }}
                        style={{
                          flex: 1,
                          padding: "0.6rem 1rem",
                          border: `2px solid ${
                            formData.entityType === type
                              ? "var(--primary)"
                              : "var(--border)"
                          }`,
                          borderRadius: "var(--radius-md)",
                          background:
                            formData.entityType === type
                              ? "#eff6ff"
                              : "var(--bg-card)",
                          color:
                            formData.entityType === type
                              ? "var(--primary)"
                              : "var(--text-secondary)",
                          fontWeight: "700",
                          fontSize: "0.875rem",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          textTransform: "capitalize",
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Office / Barangay Selection */}
                {formData.entityType === "office" ? (
                  <SearchableSelect
                    label="Office"
                    name="officeId"
                    icon={FiMapPin}
                    options={offices}
                    value={formData.officeId}
                    onChange={handleChange}
                    placeholder="Select an office"
                    error={formErrors.officeId}
                    required
                    modal
                  />
                ) : (
                  <SearchableSelect
                    label="Barangay"
                    name="barangay"
                    icon={FiMapPin}
                    options={BARANGAYS.map((b) => ({ id: b, name: b }))}
                    value={formData.barangay}
                    onChange={handleChange}
                    placeholder="Select a barangay"
                    error={formErrors.barangay}
                    required
                    modal
                  />
                )}

                {/* Category */}
                <div className="form-group">
                  <label
                    className="form-label"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FiTag size={15} />
                    Category
                    <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    {["Borrowed", "Repair"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setFormData((p) => ({ ...p, category: cat }));
                          if (formErrors.category)
                            setFormErrors((p) => ({ ...p, category: "" }));
                        }}
                        style={{
                          flex: 1,
                          padding: "0.6rem 1rem",
                          border: `2px solid ${
                            formData.category === cat
                              ? cat === "Borrowed"
                                ? "#2563eb"
                                : "#7c3aed"
                              : "var(--border)"
                          }`,
                          borderRadius: "var(--radius-md)",
                          background:
                            formData.category === cat
                              ? cat === "Borrowed"
                                ? "#eff6ff"
                                : "#f5f3ff"
                              : "var(--bg-card)",
                          color:
                            formData.category === cat
                              ? cat === "Borrowed"
                                ? "#2563eb"
                                : "#7c3aed"
                              : "var(--text-secondary)",
                          fontWeight: "700",
                          fontSize: "0.875rem",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  {formErrors.category && (
                    <p
                      style={{
                        color: "var(--danger)",
                        fontSize: "0.8rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      {formErrors.category}
                    </p>
                  )}
                </div>

                {/* Name (optional) */}
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="rb-name"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FiUser size={15} />
                    Name&nbsp;
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <input
                    id="rb-name"
                    name="name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Juan Dela Cruz"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>

                {/* Received By (optional) */}
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="rb-received-by"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FiUser size={15} />
                    Received By&nbsp;
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <input
                    id="rb-received-by"
                    name="receivedBy"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Maria Clara"
                    value={formData.receivedBy}
                    onChange={handleChange}
                  />
                </div>

                {/* Officer In Charge (optional) */}
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="rb-officer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FiUser size={15} />
                    Officer In Charge&nbsp;
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <select
                    id="rb-officer"
                    name="officerInCharge"
                    className="form-input"
                    value={formData.officerInCharge}
                    onChange={handleChange}
                  >
                    <option value="">e.g. Kap. Juan</option>
                    {officers.map((o) => (
                      <option key={o.id} value={o.name}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date — only shown after a category is picked */}
                {formData.category && (
                  <div
                    key={`date-${formData.category}`}
                    className="form-group form-field-reveal"
                  >
                    <label
                      className="form-label"
                      htmlFor="date"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <FiCalendar size={15} /> Date & Time{" "}
                      <span
                        style={{
                          fontWeight: 400,
                          color: "var(--text-muted)",
                          fontSize: "0.8rem",
                        }}
                      >
                        (optional)
                      </span>
                    </label>
                    <input
                      id="date"
                      name="date"
                      type="datetime-local"
                      className="form-input"
                      value={formData.date}
                      onChange={handleChange}
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                )}

                {/* Scanned Barcodes (Inventory Sync) */}
                {formData.category === "Borrowed" && (
                  <div
                    key="scanned-borrowed"
                    className="form-group form-field-reveal"
                  >
                    <label
                      className="form-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <FiBox size={15} />
                      Scanned Items
                      <span
                        style={{
                          fontWeight: 400,
                          color: "var(--text-muted)",
                          fontSize: "0.8rem",
                        }}
                      >
                        (Focus input and scan barcode)
                      </span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Click here and scan barcode..."
                      value={addBarcode}
                      onChange={(e) => setAddBarcode(e.target.value)}
                      onKeyDown={handleAddBarcodeKeyDown}
                      style={{ marginBottom: "0.5rem" }}
                    />
                    {borrowedWarnAdd && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: "var(--radius-md)",
                          padding: "0.5rem 0.75rem",
                          marginBottom: "0.5rem",
                          fontSize: "0.8rem",
                          color: "#b91c1c",
                          fontWeight: "600",
                        }}
                      >
                        <FiAlertCircle size={15} style={{ flexShrink: 0 }} />
                        {borrowedWarnAdd}
                      </div>
                    )}
                    {formData.scanned_barcodes &&
                      formData.scanned_barcodes.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                          }}
                        >
                          {formData.scanned_barcodes.map((code) => (
                            <div
                              key={code}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                background: "var(--bg-elevated)",
                                border: "1px solid var(--border)",
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "0.8rem",
                                fontFamily: "monospace",
                              }}
                            >
                              {code}
                              <button
                                type="button"
                                onClick={() => handleRemoveAddBarcode(code)}
                                style={{
                                  border: "none",
                                  background: "none",
                                  color: "var(--danger)",
                                  cursor: "pointer",
                                  padding: 0,
                                  display: "flex",
                                }}
                              >
                                <FiX size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                )}

                {/* Model — only shown after a category is picked */}
                {formData.category && (
                  <div
                    key={`model-${formData.category}`}
                    className="form-group form-field-reveal"
                  >
                    <label
                      className="form-label"
                      htmlFor="rb-model"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <FiCpu size={15} />
                      Model
                      <span
                        style={{
                          fontWeight: 400,
                          color: "var(--text-muted)",
                          fontSize: "0.8rem",
                        }}
                      >
                        (optional)
                      </span>
                    </label>
                    <input
                      id="rb-model"
                      name="model"
                      type="text"
                      className="form-input"
                      placeholder="e.g. HP LaserJet Pro M404n"
                      value={formData.model}
                      onChange={handleChange}
                      disabled={formData.category === "Borrowed"}
                    />
                  </div>
                )}

                {/* Unit Types — only shown after a category is picked */}
                {formData.category && (
                  <div
                    key={`units-${formData.category}`}
                    className="form-group form-field-reveal"
                  >
                    <label
                      className="form-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <FiTool size={15} />
                      Unit Type
                      <span style={{ color: "var(--danger)" }}>*</span>
                      <span
                        style={{
                          fontWeight: 400,
                          color: "var(--text-muted)",
                          fontSize: "0.8rem",
                          marginLeft: "0.25rem",
                        }}
                      >
                        — click to add, click again to increase qty
                      </span>
                    </label>

                    {/* Clickable unit buttons */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {UNIT_TYPES.map((unit) => {
                        const qty = selectedUnits[unit.id] || 0;
                        const active = qty > 0;
                        return (
                          <button
                            key={unit.id}
                            type="button"
                            disabled={formData.category === "Borrowed"}
                            onClick={() => handleUnitClick(unit.id)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              padding: "0.45rem 0.875rem",
                              border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                              borderRadius: "var(--radius-md)",
                              background: active ? "#eff6ff" : "var(--bg-card)",
                              color: active
                                ? "var(--primary)"
                                : "var(--text-secondary)",
                              fontWeight: "600",
                              fontSize: "0.8125rem",
                              cursor:
                                formData.category === "Borrowed"
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                formData.category === "Borrowed" ? 0.45 : 1,
                              transition: "all 0.15s ease",
                              position: "relative",
                            }}
                          >
                            {unit.icon}
                            {unit.label}
                            {active && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "var(--primary)",
                                  color: "white",
                                  borderRadius: "9999px",
                                  minWidth: "20px",
                                  height: "20px",
                                  fontSize: "0.7rem",
                                  fontWeight: "700",
                                  padding: "0 5px",
                                }}
                              >
                                {qty}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected units summary with remove */}
                    {Object.keys(selectedUnits).length > 0 && (
                      <div
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          padding: "0.75rem",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-muted)",
                            width: "100%",
                            marginBottom: "0.25rem",
                            fontWeight: "600",
                          }}
                        >
                          Selected units:
                        </span>
                        {Object.entries(selectedUnits).map(([id, qty]) => (
                          <div
                            key={id}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              background: "white",
                              border: "1.5px solid var(--primary)",
                              borderRadius: "var(--radius-md)",
                              padding: "0.3rem 0.625rem",
                              fontSize: "0.8125rem",
                              fontWeight: "600",
                              color: "var(--primary)",
                            }}
                          >
                            <span>{unitLabel(id)}</span>
                            <span
                              style={{
                                background: "var(--primary)",
                                color: "white",
                                borderRadius: "9999px",
                                padding: "0 6px",
                                fontSize: "0.7rem",
                                fontWeight: "700",
                              }}
                            >
                              ×{qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUnitRemove(id)}
                              title="Decrease / remove"
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "var(--danger)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                padding: 0,
                                lineHeight: 1,
                              }}
                            >
                              <FiX size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {formErrors.units && (
                      <p
                        style={{
                          color: "var(--danger)",
                          fontSize: "0.8rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        {formErrors.units}
                      </p>
                    )}
                  </div>
                )}

                {/* Description — only shown after a category is picked */}
                {formData.category && (
                  <div
                    key={`desc-${formData.category}`}
                    className="form-group form-field-reveal"
                    style={{
                      marginBottom:
                        formData.category === "Borrowed" ? "1rem" : 0,
                    }}
                  >
                    <label
                      className="form-label"
                      htmlFor="rb-description"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <FiAlertCircle size={15} />
                      Description
                      <span
                        style={{
                          fontWeight: 400,
                          color: "var(--text-muted)",
                          fontSize: "0.8rem",
                        }}
                      >
                        (optional)
                      </span>
                    </label>
                    <textarea
                      id="rb-description"
                      name="description"
                      className="form-textarea"
                      placeholder="Describe the issue, purpose for borrowing, etc."
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                    />
                  </div>
                )}

                {/* Signature Pad */}
                {formData.category === "Borrowed" && (
                  <div
                    className="form-group form-field-reveal"
                    style={{ marginBottom: 0 }}
                  >
                    <label
                      className="form-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <FiEdit2 size={15} />
                        Signature{" "}
                        <span style={{ color: "var(--danger)" }}>*</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          sigPad.current?.clear();
                          clearWacom();
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--primary)",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <FiX size={12} /> Clear
                      </button>
                    </label>
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        background: "white",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {isWacomConnected ? (
                        <div
                          style={{
                            padding: "10px",
                            textAlign: "center",
                            position: "relative",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--success)",
                              marginBottom: "5px",
                              fontWeight: "bold",
                            }}
                          >
                            <FiCheckCircle
                              style={{
                                display: "inline",
                                verticalAlign: "middle",
                              }}
                            />{" "}
                            Wacom Pad Connected
                          </p>
                          <canvas
                            ref={wacomCanvasRef}
                            width={800}
                            height={480}
                            style={{
                              width: "100%",
                              height: "150px",
                              objectFit: "contain",
                              border: "1px solid var(--border)",
                              borderRadius: "4px",
                            }}
                          />
                        </div>
                      ) : (
                        <SignatureCanvas
                          ref={sigPad}
                          canvasProps={{
                            style: { width: "100%", height: "150px" },
                          }}
                          onEnd={() => {
                            if (formErrors.signature)
                              setFormErrors((p) => ({ ...p, signature: "" }));
                          }}
                        />
                      )}
                    </div>

                    {!isWacomConnected && (
                      <div style={{ marginTop: "0.5rem", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={handleWacomConnect}
                          disabled={wacomConnecting}
                          style={{
                            background: "var(--primary)",
                            color: "white",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "none",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            opacity: wacomConnecting ? 0.7 : 1,
                          }}
                        >
                          {wacomConnecting
                            ? "Connecting..."
                            : "Use Wacom Device"}
                        </button>
                      </div>
                    )}
                    {formErrors.signature && (
                      <p
                        style={{
                          color: "var(--danger)",
                          fontSize: "0.8rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        {formErrors.signature}
                      </p>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={closeModal}
                disabled={submitting}
              >
                <FiX size={16} />
                Cancel
              </button>
              <button
                type="submit"
                form="rb-form"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div
                      className="spinner"
                      style={{ width: "16px", height: "16px" }}
                    />
                    Saving'€¦
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={16} />
                    Save Record
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* '”€'”€ View / Edit Modal '”€'”€ */}
      {viewRecord && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div
            className="modal"
            style={{ maxWidth: "680px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h3
                className="modal-title"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <FiEdit2 style={{ color: "var(--primary)" }} />
                View / Edit Record
              </h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                {/* Category badge */}
                {editData.category && (
                  <span
                    style={{
                      padding: "0.35rem 1rem",
                      borderRadius: "var(--radius-md)",
                      fontWeight: "800",
                      fontSize: "0.9rem",
                      background:
                        editData.category === "Borrowed"
                          ? "#fef3c7"
                          : "#fef3c7",
                      color:
                        editData.category === "Borrowed"
                          ? "#92400e"
                          : "#92400e",
                      border: `2px solid ${editData.category === "Borrowed" ? "#f59e0b" : "#f59e0b"}`,
                    }}
                  >
                    {editData.category}
                  </span>
                )}
                <button
                  className="btn btn-icon btn-ghost"
                  onClick={closeViewModal}
                  style={{ width: "36px", height: "36px" }}
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="modal-body">
              {editError && (
                <div
                  className="alert alert-error"
                  style={{ marginBottom: "1rem" }}
                >
                  <FiAlertCircle />
                  {editError}
                </div>
              )}

              <form id="edit-rb-form" onSubmit={(e) => e.preventDefault()}>
                {/* Entity Type Selection */}
                <div className="form-group">
                  <label
                    className="form-label"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FiMapPin size={15} />
                    Entity Type
                  </label>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    {["office", "barangay"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setEditData((p) => ({ ...p, entityType: type }));
                          setEditDirty(true);
                          setLastSaved(null);
                        }}
                        style={{
                          flex: 1,
                          padding: "0.6rem 1rem",
                          border: `2px solid ${
                            editData.entityType === type
                              ? "var(--primary)"
                              : "var(--border)"
                          }`,
                          borderRadius: "var(--radius-md)",
                          background:
                            editData.entityType === type
                              ? "#eff6ff"
                              : "var(--bg-card)",
                          color:
                            editData.entityType === type
                              ? "var(--primary)"
                              : "var(--text-secondary)",
                          fontWeight: "700",
                          fontSize: "0.875rem",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          textTransform: "capitalize",
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Office / Barangay Selection */}
                {editData.entityType === "office" ? (
                  <SearchableSelect
                    label="Office"
                    name="officeId"
                    icon={FiMapPin}
                    options={offices}
                    value={editData.officeId}
                    onChange={handleEditChange}
                    placeholder="Select an office"
                    modal
                  />
                ) : (
                  <SearchableSelect
                    label="Barangay"
                    name="barangay"
                    icon={FiMapPin}
                    options={BARANGAYS.map((b) => ({ id: b, name: b }))}
                    value={editData.barangay}
                    onChange={handleEditChange}
                    placeholder="Select a barangay"
                    modal
                  />
                )}

                {/* Name */}
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="edit-name"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FiUser size={15} /> Name{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <input
                    id="edit-name"
                    name="name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Juan Dela Cruz"
                    value={editData.name || ""}
                    onChange={handleEditChange}
                  />
                </div>

                {/* Received By */}
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="edit-received-by"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FiUser size={15} /> Received By{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <input
                    id="edit-received-by"
                    name="receivedBy"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Maria Clara"
                    value={editData.receivedBy || ""}
                    onChange={handleEditChange}
                  />
                </div>

                {/* Officer In Charge */}
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="edit-officer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FiUser size={15} /> Officer In Charge{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <select
                    id="edit-officer"
                    name="officerInCharge"
                    className="form-input"
                    value={editData.officerInCharge || ""}
                    onChange={handleEditChange}
                  >
                    <option value="">e.g. Kap. Juan</option>
                    {officers.map((o) => (
                      <option key={o.id} value={o.name}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="edit-date"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FiCalendar size={15} /> Date & Time{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <input
                    id="edit-date"
                    name="date"
                    type="datetime-local"
                    className="form-input"
                    value={
                      editData.date
                        ? new Date(editData.date).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={handleEditChange}
                    style={{ cursor: "pointer" }}
                  />
                </div>

                {/* Unit Types */}
                <div className="form-group">
                  <label
                    className="form-label"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FiTool size={15} /> Unit Types
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                        marginLeft: "0.25rem",
                      }}
                    >
                      — click to add, × to decrease
                    </span>
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {UNIT_TYPES.map((unit) => {
                      const qty = editUnits[unit.id] || 0;
                      const active = qty > 0;
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => handleEditUnitClick(unit.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.375rem",
                            padding: "0.45rem 0.875rem",
                            border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                            borderRadius: "var(--radius-md)",
                            background: active ? "#eff6ff" : "var(--bg-card)",
                            color: active
                              ? "var(--primary)"
                              : "var(--text-secondary)",
                            fontWeight: "600",
                            fontSize: "0.8125rem",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {unit.icon}
                          {unit.label}
                          {active && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "var(--primary)",
                                color: "white",
                                borderRadius: "9999px",
                                minWidth: "20px",
                                height: "20px",
                                fontSize: "0.7rem",
                                fontWeight: "700",
                                padding: "0 5px",
                              }}
                            >
                              {qty}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {Object.keys(editUnits).length > 0 && (
                    <div
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        padding: "0.75rem",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          width: "100%",
                          marginBottom: "0.25rem",
                          fontWeight: "600",
                        }}
                      >
                        Selected units:
                      </span>
                      {Object.entries(editUnits).map(([id, qty]) => (
                        <div
                          key={id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.375rem",
                            background: "white",
                            border: "1.5px solid var(--primary)",
                            borderRadius: "var(--radius-md)",
                            padding: "0.3rem 0.625rem",
                            fontSize: "0.8125rem",
                            fontWeight: "600",
                            color: "var(--primary)",
                          }}
                        >
                          <span>{unitLabel(id)}</span>
                          <span
                            style={{
                              background: "var(--primary)",
                              color: "white",
                              borderRadius: "9999px",
                              padding: "0 6px",
                              fontSize: "0.7rem",
                              fontWeight: "700",
                            }}
                          >
                            —{qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEditUnitRemove(id)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "var(--danger)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              padding: 0,
                              lineHeight: 1,
                            }}
                          >
                            <FiX size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Scanned Barcodes (Inventory Sync) */}
                {editData.category === "Borrowed" && (
                  <div className="form-group">
                    <label
                      className="form-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <FiBox size={15} />
                      Scanned Items
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Click here and scan barcode to add..."
                      value={editBarcode}
                      onChange={(e) => setEditBarcode(e.target.value)}
                      onKeyDown={handleEditBarcodeKeyDown}
                      style={{ marginBottom: "0.5rem" }}
                    />
                    {borrowedWarnEdit && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: "var(--radius-md)",
                          padding: "0.5rem 0.75rem",
                          marginBottom: "0.5rem",
                          fontSize: "0.8rem",
                          color: "#b91c1c",
                          fontWeight: "600",
                        }}
                      >
                        <FiAlertCircle size={15} style={{ flexShrink: 0 }} />
                        {borrowedWarnEdit}
                      </div>
                    )}
                    {editData.scanned_barcodes &&
                      editData.scanned_barcodes.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                          }}
                        >
                          {editData.scanned_barcodes.map((code) => (
                            <div
                              key={code}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                background: "white",
                                border: "1px solid var(--border)",
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "0.8rem",
                                fontFamily: "monospace",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                              }}
                            >
                              {code}
                              <button
                                type="button"
                                onClick={() => handleRemoveEditBarcode(code)}
                                style={{
                                  border: "none",
                                  background: "none",
                                  color: "var(--danger)",
                                  cursor: "pointer",
                                  padding: 0,
                                  display: "flex",
                                }}
                              >
                                <FiX size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                )}

                {/* Model */}
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="edit-model"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FiCpu size={15} /> Model{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <input
                    id="edit-model"
                    name="model"
                    type="text"
                    className="form-input"
                    placeholder="e.g. HP LaserJet Pro M404n"
                    value={editData.model || ""}
                    onChange={handleEditChange}
                    disabled={editData.category === "Borrowed"}
                  />
                </div>

                {/* Description */}
                <div
                  className="form-group"
                  style={{
                    marginBottom:
                      editData.category === "Borrowed" && editData.signature
                        ? "1rem"
                        : 0,
                  }}
                >
                  <label
                    className="form-label"
                    htmlFor="edit-description"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FiAlertCircle size={15} /> Description{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <textarea
                    id="edit-description"
                    name="description"
                    className="form-textarea"
                    rows={3}
                    placeholder="Describe the issue or purpose..."
                    value={editData.description || ""}
                    onChange={handleEditChange}
                  />
                </div>

                {/* Signature View */}
                {editData.category === "Borrowed" && editData.signature && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label
                      className="form-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <FiEdit2 size={15} /> Signature
                    </label>
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        background: "white",
                        padding: "0.5rem",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={editData.signature}
                        alt="Signature"
                        style={{ maxHeight: "150px" }}
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <div
              className="modal-footer"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                {editSaving && (
                  <>
                    <div
                      className="spinner"
                      style={{ width: "14px", height: "14px" }}
                    />{" "}
                    <span
                      style={{ color: "var(--primary)", fontWeight: "600" }}
                    >
                      Saving...
                    </span>
                  </>
                )}
                {!editSaving && lastSaved && (
                  <>
                    <FiCheckCircle style={{ color: "var(--success)" }} />{" "}
                    <span
                      style={{ color: "var(--success)", fontWeight: "600" }}
                    >
                      All changes saved
                    </span>
                  </>
                )}
                {!editSaving && !lastSaved && !editDirty && (
                  <span>No changes</span>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {editData.category === "Borrowed" && (
                  <button
                    className="btn btn-outline"
                    onClick={generateContract}
                    style={{
                      borderColor: "var(--primary)",
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <FiDownload size={14} /> Contract
                  </button>
                )}
                <button className="btn btn-outline" onClick={closeViewModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Change Confirmation Modal ── */}
      {statusConfirmModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1000 }}
          onClick={() => setStatusConfirmModal(null)}
        >
          <div
            className="modal"
            style={{ maxWidth: "400px", padding: "1.5rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <FiAlertCircle size={32} style={{ color: "#d97706" }} />
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.25rem",
                  color: "var(--text-primary)",
                }}
              >
                Confirm Status Change
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-secondary)",
                  fontSize: "0.95rem",
                  lineHeight: 1.5,
                }}
              >
                Are you sure you want to change the status to{" "}
                <strong style={{ color: "var(--primary)" }}>
                  {statusConfirmModal}
                </strong>
                ? This will be saved automatically.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  width: "100%",
                  marginTop: "1rem",
                }}
              >
                <button
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setStatusConfirmModal(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setEditData((p) => ({ ...p, status: statusConfirmModal }));
                    setEditDirty(true);
                    setLastSaved(null);
                    setStatusConfirmModal(null);
                  }}
                >
                  Yes, Change Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Return Form Modal ── */}
      {returnRecord && (
        <div
          className="modal-overlay"
          onClick={closeReturnModal}
          style={{ zIndex: 1100 }}
        >
          <div
            className="modal"
            style={{ maxWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h3
                className="modal-title"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <FiCheckCircle style={{ color: "var(--success)" }} />
                {returnRecord.category === "Borrowed"
                  ? "Confirm Return"
                  : "Return Equipment Form"}
              </h3>
              <button
                className="btn btn-icon btn-ghost"
                onClick={closeReturnModal}
                style={{ width: "36px", height: "36px" }}
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {returnError && (
                <div
                  className="alert alert-error"
                  style={{ marginBottom: "1rem" }}
                >
                  <FiAlertCircle />
                  {returnError}
                </div>
              )}

              <form id="return-form" onSubmit={handleReturnSubmit}>
                {returnRecord.category === "Borrowed" ? (
                  <div style={{ textAlign: "center", padding: "1rem" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "1.1rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      Are you sure you want to confirm the return of this
                      Borrowed item?
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Officer In Charge */}
                    <div className="form-group">
                      <label
                        className="form-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <FiUser size={15} /> Officer in charge
                      </label>
                      <select
                        name="officerInCharge"
                        className="form-input"
                        value={returnForm.officerInCharge}
                        onChange={handleReturnChange}
                        required
                      >
                        <option value="" disabled>
                          e.g. Kap. Juan
                        </option>
                        {officers.map((o) => (
                          <option key={o.id} value={o.name}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Pre-inspection */}
                    <div className="form-group">
                      <label
                        className="form-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <FiAlertCircle size={15} /> Pre-inspection
                      </label>
                      <textarea
                        name="preInspection"
                        className="form-textarea"
                        rows={2}
                        value={returnForm.preInspection}
                        onChange={handleReturnChange}
                      />
                    </div>

                    {/* Actions Taken */}
                    <div className="form-group">
                      <label
                        className="form-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <FiTool size={15} /> Actions Taken
                      </label>
                      <textarea
                        name="actionsTaken"
                        className="form-textarea"
                        rows={2}
                        value={returnForm.actionsTaken}
                        onChange={handleReturnChange}
                      />
                    </div>

                    {/* Result/Outcome */}
                    <div className="form-group">
                      <label
                        className="form-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <FiCheckCircle size={15} /> Result/Outcome
                      </label>
                      <input
                        name="resultOutcome"
                        type="text"
                        className="form-input"
                        value={returnForm.resultOutcome}
                        onChange={handleReturnChange}
                      />
                    </div>

                    {/* Handed over to */}
                    <div className="form-group">
                      <label
                        className="form-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <FiUser size={15} /> Handed over to
                      </label>
                      <input
                        name="handedOverTo"
                        type="text"
                        className="form-input"
                        value={returnForm.handedOverTo}
                        onChange={handleReturnChange}
                        required
                      />
                    </div>
                  </>
                )}
              </form>
            </div>

            {/* Footer */}
            <div
              className="modal-footer"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <button
                className="btn btn-ghost"
                onClick={closeReturnModal}
                disabled={returnSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="return-form"
                className="btn btn-primary"
                style={{
                  background: "#10b981",
                  borderColor: "#10b981",
                  color: "white",
                }}
                disabled={returnSubmitting}
              >
                {returnSubmitting ? "Returning..." : "Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RepairBorrowed;
