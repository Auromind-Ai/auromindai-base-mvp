"use client";

import { useEffect } from "react";

export default function AppSessionInit() {
  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("workspace");
    localStorage.removeItem("workspace_id");
  }, []);

  return null;
}
