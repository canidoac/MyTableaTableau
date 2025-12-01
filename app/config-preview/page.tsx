"use client"

import { useState } from "react"

export default function ConfigPreview() {
  const [selectedColumn, setSelectedColumn] = useState<string | null>("Username")
  const [searchTerm, setSearchTerm] = useState("")

  const columns = {
    dimensions: [
      { fieldName: "Username", displayName: "Username", visible: true },
      { fieldName: "Manager_Username", displayName: "Manager Username", visible: true },
      { fieldName: "Division_Nombre", displayName: "División Nombre", visible: true },
    ],
    measures: [
      { fieldName: "Sales", displayName: "Ventas", visible: true },
      { fieldName: "Quantity", displayName: "Cantidad", visible: false },
    ],
    calculations: [{ fieldName: "Profit_Ratio", displayName: "Ratio de Ganancia", visible: true }],
  }

  const allColumns = [...columns.dimensions, ...columns.measures, ...columns.calculations]

  const selectedColumnData = allColumns.find((col) => col.fieldName === selectedColumn)

  const filteredColumns = {
    dimensions: columns.dimensions.filter((col) => col.fieldName.toLowerCase().includes(searchTerm.toLowerCase())),
    measures: columns.measures.filter((col) => col.fieldName.toLowerCase().includes(searchTerm.toLowerCase())),
    calculations: columns.calculations.filter((col) => col.fieldName.toLowerCase().includes(searchTerm.toLowerCase())),
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">MeliTable - Configuración</h1>
            <div className="flex gap-2">
              <button className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Cancelar</button>
              <button className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Guardar y Cerrar</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-8 px-6">
              <button className="py-3 text-gray-500 border-b-2 border-transparent hover:text-gray-700">General</button>
              <button className="py-3 text-blue-600 border-b-2 border-blue-600 font-medium">Data</button>
            </div>
          </div>

          {/* Content */}
          <div className="flex" style={{ height: "500px" }}>
            {/* Sidebar */}
            <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
              {/* Search */}
              <div className="p-4">
                <input
                  type="text"
                  placeholder="Buscar dimensión..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Dimensions */}
              <div className="px-4 pb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">DIMENSIONES</h3>
                <div className="space-y-1">
                  {filteredColumns.dimensions.map((col) => (
                    <button
                      key={col.fieldName}
                      onClick={() => setSelectedColumn(col.fieldName)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedColumn === col.fieldName
                          ? "bg-pink-100 text-pink-900 font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {col.fieldName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Measures */}
              <div className="px-4 pb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">MEDIDAS</h3>
                {filteredColumns.measures.length > 0 ? (
                  <div className="space-y-1">
                    {filteredColumns.measures.map((col) => (
                      <button
                        key={col.fieldName}
                        onClick={() => setSelectedColumn(col.fieldName)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedColumn === col.fieldName
                            ? "bg-pink-100 text-pink-900 font-medium"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {col.fieldName}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic px-3 py-2">No hay medidas.</p>
                )}
              </div>

              {/* Calculations */}
              <div className="px-4 pb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">CÁLCULOS</h3>
                {filteredColumns.calculations.length > 0 ? (
                  <div className="space-y-1">
                    {filteredColumns.calculations.map((col) => (
                      <button
                        key={col.fieldName}
                        onClick={() => setSelectedColumn(col.fieldName)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedColumn === col.fieldName
                            ? "bg-pink-100 text-pink-900 font-medium"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {col.fieldName}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic px-3 py-2">No hay cálculos.</p>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
              {selectedColumnData ? (
                <div className="max-w-2xl">
                  {/* Display Name */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de visualización</label>
                    <input
                      type="text"
                      value={selectedColumnData.displayName}
                      placeholder="Nombre personalizado para la columna"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Deja vacío para usar el nombre original</p>
                  </div>

                  {/* Visibility */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Visibilidad</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedColumnData.visible}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Mostrar esta columna en la tabla</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">Selecciona una columna para editar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
