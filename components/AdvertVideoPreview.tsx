"use client";
import React, { useMemo, useState } from "react";
import { Badge, Button } from "react-bootstrap";
import { parseVideoUrl, openVideoUrl } from "@/helpers/videoUrl";

interface AdvertVideoPreviewProps {
  videoUrl?: string | null;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function AdvertVideoPreview({
  videoUrl,
  compact = false,
  className = "",
  style,
}: AdvertVideoPreviewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const parsed = useMemo(() => parseVideoUrl(videoUrl), [videoUrl]);

  if (!parsed.isValid) {
    return null;
  }

  const handleOpen = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    openVideoUrl(parsed.url);
  };

  const isYouTube = parsed.platform === "youtube";
  const isVimeo = parsed.platform === "vimeo";

  return (
    <div
      className={`card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-3 ${className}`}
      style={{
        border: "1px solid #e2e8f0",
        ...style,
      }}
    >
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between px-3 py-2.5 border-bottom bg-white">
        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center text-primary"
            style={{
              width: "32px",
              height: "32px",
              backgroundColor: "#eef2ff",
            }}
          >
            <i className="fe fe-video fs-5" />
          </div>
          <span className="fw-bold text-dark" style={{ fontSize: "14px" }}>
            İlan Videosu
          </span>
          <Badge
            className="d-inline-flex align-items-center gap-1 px-2 py-1 text-white border-0"
            style={{
              fontSize: "11px",
              fontWeight: 700,
              backgroundColor: isYouTube
                ? "#dc2626"
                : isVimeo
                ? "#0284c7"
                : "#475569",
              borderRadius: "6px",
            }}
          >
            <i
              className={
                isYouTube
                  ? "fe fe-play-circle"
                  : isVimeo
                  ? "fe fe-film"
                  : "fe fe-video"
              }
              style={{ fontSize: "11px" }}
            />
            {parsed.platformName}
          </Badge>
        </div>

        <Button
          variant="outline-primary"
          size="sm"
          className="d-inline-flex align-items-center gap-1.5 py-1 px-2.5 rounded-pill fw-semibold"
          style={{ fontSize: "12px" }}
          onClick={handleOpen}
        >
          <span>Yeni sekmede izle</span>
          <i className="fe fe-external-link" style={{ fontSize: "12px" }} />
        </Button>
      </div>

      {/* Video Media Container */}
      <div
        className="position-relative overflow-hidden w-100"
        style={{
          aspectRatio: "16 / 9",
          maxHeight: compact ? "260px" : "340px",
          backgroundColor: "#000000",
          cursor: "pointer",
        }}
        onClick={handleOpen}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Thumbnail or Fallback Background */}
        {parsed.thumbnailUrl ? (
          <img
            src={parsed.thumbnailUrl}
            alt={parsed.platformName}
            className="w-100 h-100"
            style={{
              objectFit: "cover",
              transform: isHovered ? "scale(1.04)" : "scale(1)",
              transition: "transform 0.3s ease",
            }}
          />
        ) : (
          <div
            className="w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ backgroundColor: "#090d16" }}
          >
            <i
              className="fe fe-film text-white opacity-25"
              style={{ fontSize: "56px" }}
            />
          </div>
        )}

        {/* Ambient Dark Scrim Overlay */}
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.75) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Centered Glowing Play Button */}
        <div
          className="position-absolute top-50 start-50 translate-middle d-flex flex-column align-items-center justify-content-center text-center gap-2"
          style={{ pointerEvents: "none" }}
        >
          <div
            className="rounded-circle d-flex align-items-center justify-content-center"
            style={{
              padding: "6px",
              backgroundColor: isHovered
                ? "rgba(255, 255, 255, 0.35)"
                : "rgba(255, 255, 255, 0.2)",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white"
              style={{
                width: compact ? "52px" : "62px",
                height: compact ? "52px" : "62px",
                backgroundColor: isYouTube
                  ? "#dc2626"
                  : "rgba(15, 23, 42, 0.88)",
                border: "2.5px solid rgba(255, 255, 255, 0.95)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                transform: isHovered ? "scale(1.1)" : "scale(1)",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <i
                className="fe fe-play"
                style={{
                  fontSize: compact ? "22px" : "26px",
                  marginLeft: "3px",
                }}
              />
            </div>
          </div>
          <span
            className="text-white fw-bold small"
            style={{
              textShadow: "0 1px 3px rgba(0, 0, 0, 0.8)",
              letterSpacing: "0.02em",
              fontSize: "12px",
            }}
          >
            {parsed.platformName} üzerinde oynat
          </span>
        </div>

        {/* Bottom Bar Info */}
        <div
          className="position-absolute bottom-0 start-0 end-0 px-3 py-2 d-flex align-items-center justify-content-between text-white"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(6px)",
            pointerEvents: "none",
          }}
        >
          <div className="d-flex align-items-center gap-1.5 overflow-hidden me-2">
            <i
              className="fe fe-link opacity-75"
              style={{ fontSize: "12px" }}
            />
            <span
              className="small text-truncate opacity-90 fw-medium"
              style={{ fontSize: "12px" }}
            >
              {parsed.url}
            </span>
          </div>
          <div className="d-flex align-items-center gap-1 flex-shrink-0">
            <span
              className="badge bg-white bg-opacity-20 text-white rounded-pill px-2 py-0.5"
              style={{ fontSize: "11px" }}
            >
              İzle
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
