'use client'

import React from 'react'
import type { ComandaTemplate, ComandaConCategorias } from './types'

interface Props {
  comanda: ComandaConCategorias
  template: ComandaTemplate
}

export const ComandaLetterhead: React.FC<Props> = ({ comanda, template }) => {
  const { header, pacienteBlock, comandaBlock, analitosBlock, footer } = template

  const formatDate = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const calcularEdad = (fechaNacimiento?: string | null) => {
    if (!fechaNacimiento) return ''
    const fn = new Date(fechaNacimiento)
    const hoy = new Date()
    let edad = hoy.getFullYear() - fn.getFullYear()
    const m = hoy.getMonth() - fn.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) edad--
    return `${edad} años`
  }

  const getEstadoLabel = (estado: string) => {
    const estados: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      EN_PROCESO: 'En Proceso',
      COMPLETADA: 'Completada',
      ENTREGADA: 'Entregada'
    }
    return estados[estado] || estado
  }

  return (
    <div
      className="mx-auto print:mx-0"
      style={{
        width: '21cm', // carta aproximado
        minHeight: '27cm',
        paddingTop: `${template.marginTop}mm`,
        paddingBottom: `${template.marginBottom}mm`,
        paddingLeft: `${template.marginLeft}mm`,
        paddingRight: `${template.marginRight}mm`,
        backgroundColor: 'rgb(var(--color-gray-50))',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Header */}
      <header 
        className="flex items-start gap-4 pb-3 mb-4"
        style={{
          borderBottom: '1px solid rgb(var(--color-gray-300))'
        }}
      >
        {header.showLogo && comanda.laboratorioInfo?.logoUrl && (
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={comanda.laboratorioInfo.logoUrl} 
              alt="Logo laboratorio" 
              className="h-16 w-auto object-contain" 
            />
          </div>
        )}
        <div
          className={
            header.alignment === 'center'
              ? 'text-center w-full'
              : header.alignment === 'right'
              ? 'text-right w-full'
              : 'text-left w-full'
          }
        >
          {header.showLabName && comanda.laboratorioInfo?.nombre && (
            <h1 
              className="font-bold text-xl"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {comanda.laboratorioInfo.nombre}
            </h1>
          )}
          {header.showLabAddress && comanda.laboratorioInfo?.direccion && (
            <p 
              className="text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {comanda.laboratorioInfo.direccion}
            </p>
          )}
          {header.showLabPhone && comanda.laboratorioInfo?.telefono && (
            <p 
              className="text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Tel: {comanda.laboratorioInfo.telefono}
            </p>
          )}
          {header.showSucursal && (
            <p 
              className="text-xs mt-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sucursal: {comanda.sucursal.nombre}
              {comanda.sucursal.direccion && ` · ${comanda.sucursal.direccion}`}
            </p>
          )}
        </div>
      </header>

      {/* Datos paciente + comanda (dos columnas) */}
      <section className="grid grid-cols-2 gap-4 text-xs mb-4">
        {/* Paciente / Cliente */}
        <div 
          className="rounded p-2"
          style={{
            border: '1px solid rgb(var(--color-gray-300))',
            backgroundColor: 'rgb(var(--color-gray-100))'
          }}
        >
          <h2 
            className="font-semibold text-sm mb-2 pb-1"
            style={{
              borderBottom: '1px solid rgb(var(--color-gray-300))',
              color: 'var(--color-text-primary)'
            }}
          >
            Datos del paciente
          </h2>
          <div className="space-y-1" style={{ color: 'var(--color-text-primary)' }}>
            {pacienteBlock.showNombre && (
              <p>
                <span className="font-semibold">Nombre:</span>{' '}
                {comanda.cliente.nombre} {comanda.cliente.apellido}
              </p>
            )}
            {pacienteBlock.showFechaNacimiento && comanda.cliente.fechaNacimiento && (
              <p>
                <span className="font-semibold">Fecha de nacimiento:</span>{' '}
                {formatDate(comanda.cliente.fechaNacimiento)}
              </p>
            )}
            {pacienteBlock.showEdad && (
              <p>
                <span className="font-semibold">Edad:</span>{' '}
                {calcularEdad(comanda.cliente.fechaNacimiento)}
              </p>
            )}
            {pacienteBlock.showTelefono && comanda.cliente.telefono && (
              <p>
                <span className="font-semibold">Teléfono:</span>{' '}
                {comanda.cliente.telefono}
              </p>
            )}
            {pacienteBlock.showEmail && comanda.cliente.email && (
              <p>
                <span className="font-semibold">Email:</span>{' '}
                {comanda.cliente.email}
              </p>
            )}
          </div>
        </div>

        {/* Datos comanda */}
        <div 
          className="rounded p-2"
          style={{
            border: '1px solid rgb(var(--color-gray-300))',
            backgroundColor: 'rgb(var(--color-gray-100))'
          }}
        >
          <h2 
            className="font-semibold text-sm mb-2 pb-1"
            style={{
              borderBottom: '1px solid rgb(var(--color-gray-300))',
              color: 'var(--color-text-primary)'
            }}
          >
            Datos de la comanda
          </h2>
          <div className="space-y-1" style={{ color: 'var(--color-text-primary)' }}>
            {comandaBlock.showNumeroComanda && (
              <p>
                <span className="font-semibold">No. Comanda:</span>{' '}
                {comanda.numeroComanda}
              </p>
            )}
            {comandaBlock.showFechaCreacion && (
              <p>
                <span className="font-semibold">Fecha de creación:</span>{' '}
                {formatDate(comanda.fechaCreacion)}
              </p>
            )}
            {comandaBlock.showFechaEntrega && comanda.fechaEntrega && (
              <p>
                <span className="font-semibold">Fecha de entrega:</span>{' '}
                {formatDate(comanda.fechaEntrega)}
              </p>
            )}
            {comandaBlock.showEstado && (
              <p>
                <span className="font-semibold">Estado:</span>{' '}
                {getEstadoLabel(comanda.estado)}
              </p>
            )}
            {comanda.observaciones && (
              <p 
                className="mt-2 pt-2"
                style={{
                  borderTop: '1px solid rgb(var(--color-gray-300))',
                  color: 'var(--color-text-primary)'
                }}
              >
                <span className="font-semibold">Observaciones:</span>{' '}
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {comanda.observaciones}
                </span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Analitos / parámetros */}
      <section className="text-xs">
        <h2 
          className="font-semibold text-base mb-3 pb-2"
          style={{
            borderBottom: '1px solid rgb(var(--color-gray-300))',
            color: 'var(--color-text-primary)'
          }}
        >
          {comanda.tipoPrueba.nombre}
        </h2>

        {comanda.elementosAgrupados && comanda.elementosAgrupados.length > 0 ? (
          comanda.elementosAgrupados.map((grupo, idx) => (
            <div key={idx} className="mb-4">
              {/* Título de categoría */}
              {grupo.categoria ? (
                <div className="mb-2">
                  <p 
                    className="font-semibold text-sm"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {grupo.categoria.nombre}
                  </p>
                  {grupo.categoria.descripcion && (
                    <p 
                      className="text-[10px] italic"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {grupo.categoria.descripcion}
                    </p>
                  )}
                </div>
              ) : (
                <p 
                  className="font-semibold text-sm mb-2"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Otros parámetros
                </p>
              )}

              {/* Tabla de elementos */}
              <table 
                className="w-full border-collapse"
                style={{
                  border: '1px solid rgb(var(--color-gray-300))'
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: 'rgb(var(--color-gray-200))' }}>
                    <th 
                      className="px-2 py-1.5 text-left font-semibold text-xs"
                      style={{
                        border: '1px solid rgb(var(--color-gray-300))',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      Parámetro
                    </th>
                    {analitosBlock.showUnidad && (
                      <th 
                        className="px-2 py-1.5 text-left font-semibold text-xs"
                        style={{
                          border: '1px solid rgb(var(--color-gray-300))',
                          color: 'var(--color-text-primary)'
                        }}
                      >
                        Unidad
                      </th>
                    )}
                    {analitosBlock.showResultados && (
                      <th 
                        className="px-2 py-1.5 text-left font-semibold text-xs"
                        style={{
                          border: '1px solid rgb(var(--color-gray-300))',
                          color: 'var(--color-text-primary)'
                        }}
                      >
                        Resultado
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {grupo.elementos.map((el, i) => (
                    <tr 
                      key={i}
                      style={{
                        backgroundColor: i % 2 === 0 ? 'transparent' : 'rgb(var(--color-gray-50))'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-100))'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'transparent' : 'rgb(var(--color-gray-50))'
                      }}
                    >
                      <td 
                        className="px-2 py-1.5 align-top"
                        style={{
                          border: '1px solid rgb(var(--color-gray-300))',
                          color: 'var(--color-text-primary)'
                        }}
                      >
                        <span className="font-medium">{el.nombre}</span>
                        {analitosBlock.showDescripcionAnalito && el.descripcion && (
                          <div 
                            className="text-[10px] mt-0.5"
                            style={{ color: 'var(--color-text-tertiary)' }}
                          >
                            {el.descripcion}
                          </div>
                        )}
                      </td>
                      {analitosBlock.showUnidad && (
                        <td 
                          className="px-2 py-1.5 align-top"
                          style={{
                            border: '1px solid rgb(var(--color-gray-300))',
                            color: 'var(--color-text-secondary)'
                          }}
                        >
                          {el.unidad || '-'}
                        </td>
                      )}
                      {analitosBlock.showResultados && (
                        <td 
                          className="px-2 py-1.5 align-top min-h-[20px]"
                          style={{
                            border: '1px solid rgb(var(--color-gray-300))',
                            color: 'var(--color-text-primary)'
                          }}
                        >
                          {el.tieneResultado && el.resultado ? (
                            <div>
                              <span className="font-medium">{el.resultado.valor}</span>
                              {el.resultado.unidad && (
                                <span 
                                  className="ml-1"
                                  style={{ color: 'var(--color-text-tertiary)' }}
                                >
                                  {el.resultado.unidad}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-tertiary)' }}>
                              _____
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        ) : (
          <div 
            className="text-center py-4"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <p>No hay elementos registrados</p>
          </div>
        )}
      </section>

      {/* Footer */}
      {footer.showFooter && footer.showConfidentialText && (
        <footer 
          className="text-[10px] mt-6 pt-2 text-center"
          style={{
            borderTop: '1px solid rgb(var(--color-gray-300))',
            color: 'var(--color-text-tertiary)'
          }}
        >
          Este documento es confidencial y solo puede ser utilizado por el paciente.
        </footer>
      )}
    </div>
  )
}

