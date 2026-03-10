"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react"; // Asumiendo que usas lucide-react

export default function BotonTema() {
  const [montado, setMontado] = useState(false);
  const { theme, setTheme } = useTheme();

  // Evita errores de hidratación asegurando que el componente solo cargue en el cliente
  useEffect(() => setMontado(true), []);

  if (!montado) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      title="Cambiar tema"
    >
      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}