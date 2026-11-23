
export default function ActividadPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8bbec6]">
          Seguimiento del sistema
        </p>

        <h1 className="font-heading text-3xl font-bold text-foreground">
          Registro de actividad
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Consulta los eventos, operaciones y movimientos registrados en SPING.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-[#8bbec6]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="size-7"
          >
            <path d="M12 8v4l3 2" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>

        <h2 className="font-heading text-lg font-semibold">
          Historial de actividad
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Próximamente mostraremos el historial de clasificaciones,
          operaciones RFID, eventos y actividad de los dispositivos.
        </p>
      </div>
    </div>
  );
}
