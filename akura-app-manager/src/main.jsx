const shellUrl =
  import.meta.env.VITE_AKURA_SHELL_URL || "http://localhost:4173";

window.location.replace(`${shellUrl}/app_manager/menus`);
