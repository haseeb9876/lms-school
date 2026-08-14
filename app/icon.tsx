import { ImageResponse } from "next/og";
import { getBrandingSettings } from "@/lib/branding";
import { readableTextColor } from "@/lib/color";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const branding = await getBrandingSettings();
  const initial = branding.schoolName.trim().charAt(0).toUpperCase() || "S";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: branding.primaryColor,
          color: readableTextColor(branding.primaryColor),
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "sans-serif",
          borderRadius: 7,
        }}
      >
        {initial}
      </div>
    ),
    { ...size }
  );
}
