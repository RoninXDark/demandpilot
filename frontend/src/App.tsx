import { useEffect, useState } from "react";

import { ControlTower } from "./pages/ControlTower";
import { LandingPage } from "./pages/LandingPage";
import "./styles.css";

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (
      path === "/" &&
      window.localStorage.getItem("demandpilot-demo-session") === "active"
    ) {
      window.history.replaceState({}, "", "/app");
      setPath("/app");
    }
  }, [path]);

  function openDemo() {
    window.localStorage.setItem("demandpilot-demo-session", "active");
    window.history.pushState({}, "", "/app");
    setPath("/app");
    window.scrollTo(0, 0);
  }

  function exitDemo() {
    window.localStorage.removeItem("demandpilot-demo-session");
    window.history.pushState({}, "", "/");
    setPath("/");
    window.scrollTo(0, 0);
  }

  return path.startsWith("/app") ? (
    <ControlTower onExitDemo={exitDemo} />
  ) : (
    <LandingPage onOpenDemo={openDemo} />
  );
}
