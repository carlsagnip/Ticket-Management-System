import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiChevronDown, FiSearch, FiX } from "react-icons/fi";

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  error = null,
  icon: Icon = null,
  label,
  required = false,
  modal = false,
  name = "officeId", // Default for backward compatibility
  style = {},
  modalWidth = "300px",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Find selected option object
  const selectedOption = options.find((opt) => opt.id === value);

  // Filter options based on search term
  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // For modal mode, we handle click outside on the overlay div
      if (
        !modal &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    if (isOpen && !modal) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Lock body scroll when modal is open
    if (modal && isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, modal]);

  const handleSelect = (option) => {
    onChange({ target: { name: name, value: option.id } });
    setIsOpen(false);
    setSearchTerm("");
  };

  const closeModal = (e) => {
    if (e) e.stopPropagation();
    setIsOpen(false);
    setSearchTerm("");
  };

  // Helper to clear selection if needed (optional feature)
  const clearSelection = (e) => {
    e.stopPropagation();
    onChange({ target: { name: name, value: "" } });
  };

  // Render logic for the list container
  const renderList = () => {
    if (!isOpen) return null;

    if (modal) {
      return createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "transparent", // Transparent overlay
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "var(--radius-lg)", // Larger radius for modal
              boxShadow: "var(--shadow-xl)",
              width: "100%",
              maxWidth: modalWidth, // Customized modal width
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "0.75rem 1rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
                {label || "Select Option"}
              </h3>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.25rem",
                }}
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div
              style={{
                padding: "0.75rem 1rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "var(--bg-highlight)",
              }}
            >
              <FiSearch style={{ color: "var(--text-muted)" }} />
              <input
                ref={inputRef}
                type="text"
                placeholder={`Search...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                style={{
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  width: "100%",
                  fontSize: "0.875rem",
                }}
              />
            </div>

            {/* Options List */}
            <div style={{ overflowY: "auto", maxHeight: "160px" }}>
              {" "}
              {/* Compact height ~4 items */}
              {renderOptionsList()}
            </div>
          </div>
        </div>,
        document.body,
      );
    }

    // Default Dropdown
    return (
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          marginTop: "4px",
          boxShadow: "var(--shadow-lg)",
          zIndex: 1000,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "0.5rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <FiSearch style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            style={{
              border: "none",
              outline: "none",
              width: "100%",
              fontSize: "0.875rem",
            }}
          />
        </div>
        <div style={{ maxHeight: "200px", overflowY: "auto" }}>
          {renderOptionsList()}
        </div>
      </div>
    );
  };

  const renderOptionsList = () => {
    if (filteredOptions.length === 0) {
      return (
        <div
          style={{
            padding: "1.5rem 1rem",
            textAlign: "center",
            color: "var(--text-muted)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <FiSearch size={20} style={{ opacity: 0.3 }} />
          <span style={{ fontSize: "0.875rem" }}>No options found</span>
        </div>
      );
    }

    return filteredOptions.map((option) => (
      <div
        key={option.id}
        onClick={(e) => {
          e.stopPropagation();
          handleSelect(option);
        }}
        style={{
          padding: "0.6rem 1rem",
          cursor: "pointer",
          transition: "background 0.2s",
          background: value === option.id ? "#f3f4f6" : "transparent", // Subtler select color
          color: "var(--text-primary)", // Keep text normal color
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: value === option.id ? "500" : "400",
          fontSize: "0.875rem",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
        onMouseLeave={(e) =>
          (e.currentTarget.style.background =
            value === option.id ? "#f3f4f6" : "transparent")
        }
      >
        {option.name}
        {value === option.id && (
          <span style={{ fontSize: "12px", color: "var(--primary)" }}>✓</span>
        )}
      </div>
    ));
  };

  return (
    <>
      <div
        className="form-group"
        ref={dropdownRef}
        style={{ minWidth: 0, ...style }}
      >
        {label && (
          <label
            className="form-label"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              textTransform: "none",
            }}
          >
            {Icon && <Icon size={16} />}
            {label}
            {required && <span style={{ color: "var(--danger)" }}>*</span>}
          </label>
        )}

        <div
          className={`form-select ${disabled ? "disabled" : ""}`}
          onClick={() => !disabled && setIsOpen(true)}
          style={{
            padding: "0",
            height: "auto",
            minHeight: "42px",
            display: "flex",
            position: "relative",
            cursor: disabled ? "not-allowed" : "pointer",
            border: error ? "1px solid var(--danger)" : undefined,
            backgroundColor: "var(--bg-card)", // Ensure background matches inputs
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              padding: "0.5rem 1rem",
              color: selectedOption
                ? "var(--text-primary)"
                : "var(--text-muted)",
              minWidth: 0, // Critical for preventing flex item from expanding
            }}
          >
            <span
              title={selectedOption ? selectedOption.name : ""}
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                width: "100%",
                display: "block",
              }}
            >
              {selectedOption ? selectedOption.name : placeholder}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingRight: "1rem",
              color: "var(--text-secondary)",
            }}
          >
            <FiChevronDown />
          </div>
        </div>

        {error && (
          <p
            style={{
              color: "var(--danger)",
              fontSize: "0.875rem",
              marginTop: "0.25rem",
            }}
          >
            {error}
          </p>
        )}
      </div>

      {/* Render list (Dropdown or Modal) */}
      {renderList()}
    </>
  );
};

export default SearchableSelect;
