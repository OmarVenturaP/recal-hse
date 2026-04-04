"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { Pencil, Trash2, Upload, FileSpreadsheet, Users } from 'lucide-react';
import Swal from 'sweetalert2';

export default function FuerzaTrabajoPage() {
  const topRef = useRef(null); 
  const [userRole, setUserRole] = useState(null);
  const [userFtPermission, setUserFtPermission] = useState(null); 
  const [userCertPermission, setUserCertPermission] = useState(null);
  const [userDcPermission, setUserDcPermission] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) setUserRole(data.user.rol);
      });

    fetch('/api/usuarios/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.length > 0) {
          setUserFtPermission(data.data[0].permisos_ft);
          setUserCertPermission(data.data[0].permisos_certificados);
          setUserDcPermission(data.data[0].permisos_dc3);
        }
      });
  }, []);

  const canManageFt = userFtPermission === 1 || userRole === 'Master';
  const canManageCert = userCertPermission === 1 || userRole === 'Master';
  const canManageDc3 = userDcPermission === 1 || userRole === 'Master';

  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);

  const [catPrincipales, setCatPrincipales] = useState([]);
  const [catCuadrillas, setCatCuadrillas] = useState([]);
  const [catPuestos, setCatPuestos] = useState([]);

  const getDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const hoy = new Date();
  const haceUnaSemana = new Date();
  haceUnaSemana.setDate(hoy.getDate() - 6);

  const [fechaInicio, setFechaInicio] = useState(getDateString(haceUnaSemana));
  const [fechaFin, setFechaFin] = useState(getDateString(hoy));
  const [filtroSub, setFiltroSub] = useState('');
  const [soloFaltaCurp, setSoloFaltaCurp] = useState(false);
  const [soloFaltaCuadrilla, setSoloFaltaCuadrilla] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const [ordenPor, setOrdenPor] = useState('fecha_ingreso_obra');
  const [ordenDireccion, setOrdenDireccion] = useState('DESC');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [isBajaModalOpen, setIsBajaModalOpen] = useState(false);
  const [bajaId, setBajaId] = useState(null);
  const [bajaFecha, setBajaFecha] = useState('');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importSubcontratista, setImportSubcontratista] = useState('');
  const [importPreviewData, setImportPreviewData] = useState([]); 
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importFase, setImportFase] = useState(1); 
  const [importResumen, setImportResumen] = useState({ totales: 0, nuevos: 0 });

  // --- ESTADOS PARA IMPORTADOR SUA (PDF) ---
  const [showSuaModal, setShowSuaModal] = useState(false);
  const [suaFile, setSuaFile] = useState(null);
  const [suaLoading, setSuaLoading] = useState(false);
  const [suaPreview, setSuaPreview] = useState([]);
  const [suaFase, setSuaFase] = useState(1); // 1: Upload, 2: Preview

  const [isDc3ModalOpen, setIsDc3ModalOpen] = useState(false);
  const [dc3Trabajador, setDc3Trabajador] = useState(null);
  const [catCursos, setCatCursos] = useState([]);
  const [catAgentes, setCatAgentes] = useState([]);
  const [selectedAgente, setSelectedAgente] = useState('');
  
  const [dc3FormData, setDc3FormData] = useState({
    id_curso: '',
    fecha_inicio_curso: getDateString(hoy),
    fecha_fin_curso: getDateString(hoy)
  });
  const [generatingDc3, setGeneratingDc3] = useState(false);

  const formInicial = {
    numero_empleado: '', nombre_trabajador: '', apellido_trabajador: '', puesto_categoria: '', 
    nss: '', curp: '', fecha_ingreso_obra: '', fecha_alta_imss: '', 
    origen: 'Local', id_subcontratista_ft: '', id_subcontratista_principal: '',
    fecha_baja: '', 
    tiene_baja: false 
  };
  
  const [formData, setFormData] = useState(formInicial);

  const formatDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const res = await fetch('/api/catalogos/subcontratistas');
        const data = await res.json();
        if (data.success) {
          setCatPrincipales(data.principales);
          setCatCuadrillas(data.cuadrillas);
        }

        const resPuestos = await fetch('/api/fuerza-trabajo/puestos');
        const dataPuestos = await resPuestos.json();
        if (dataPuestos.success) {
          setCatPuestos(dataPuestos.puestos);
        }

        const resCursos = await fetch('/api/catalogos/cursos');
        if (resCursos.ok) {
          const dataCursos = await resCursos.json();
          setCatCursos(Array.isArray(dataCursos) ? dataCursos : (dataCursos.data || []));
        }

        const resAgentes = await fetch('/api/catalogos/agentes');
        if (resAgentes.ok) {
          const dataAgentes = await resAgentes.json();
          setCatAgentes(Array.isArray(dataAgentes) ? dataAgentes : (dataAgentes.data || []));
        }

      } catch (error) {
        console.error("Error cargando catálogos", error);
      }
    };
    fetchCatalogos();
  }, []);

  const fetchTrabajadores = async () => {
    setLoading(true);
    try {
      let url = `/api/fuerza-trabajo?ordenPor=${ordenPor}&ordenDireccion=${ordenDireccion}&`;
      if (filtroSub) url += `subcontratista=${filtroSub}&`; 
      if (fechaInicio && fechaFin) url += `fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&`;
      if (busqueda) url += `busqueda=${encodeURIComponent(busqueda)}&`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setTrabajadores(json.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrabajadores(); }, [filtroSub, fechaInicio, fechaFin, busqueda, ordenPor, ordenDireccion]);
  useEffect(() => { setCurrentPage(1); }, [filtroSub, fechaInicio, fechaFin, busqueda, ordenPor, ordenDireccion]);

  useEffect(() => {
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentPage]);

  const trabajadoresFiltrados = useMemo(() => {
    return trabajadores.filter(t => {
      // Filtro de CURP
      let cumpleCurp = true;
      if (soloFaltaCurp) {
        const fechaIngresoStr = formatForInput(t.fecha_ingreso_obra);
        const isAlta = fechaIngresoStr >= fechaInicio && fechaIngresoStr <= fechaFin;
        const categoriasCriticas = ["SUPERVISOR DE SEGURIDAD", "OPERADOR DE MAQUINARIA", "SOLDADOR", "PINTOR", "ANDAMIERO", "ANDAMIERO A", "SANDBLASTERO", "SANDBLASTERO A", "MANIOBRISTA"];
        const requiereCurp = t.puesto_categoria && categoriasCriticas.some(cat => t.puesto_categoria.toUpperCase().includes(cat));
        cumpleCurp = isAlta && requiereCurp && (!t.curp || t.curp.length < 18);
      }

      // Filtro de Cuadrilla
      let cumpleCuadrilla = true;
      if (soloFaltaCuadrilla) {
        cumpleCuadrilla = !t.id_subcontratista_ft || t.id_subcontratista_ft === '';
      }

      if (soloFaltaCurp && soloFaltaCuadrilla) return cumpleCurp && cumpleCuadrilla;
      if (soloFaltaCurp) return cumpleCurp;
      if (soloFaltaCuadrilla) return cumpleCuadrilla;
      
      return true;
    });
  }, [trabajadores, soloFaltaCurp, soloFaltaCuadrilla, fechaInicio, fechaFin]);

  const totalPages = Math.ceil(trabajadoresFiltrados.length / itemsPerPage);
  
  const getPageNumbers = () => {
    const maxPagesToShow = 5;
    const pages = [];
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);
      if (currentPage <= 3) endPage = 5;
      else if (currentPage >= totalPages - 2) startPage = totalPages - 4;
      for (let i = startPage; i <= endPage; i++) pages.push(i);
    }
    return pages;
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const trabajadoresPaginados = trabajadoresFiltrados.slice(indexOfFirstItem, indexOfLastItem);

  const manejarOrden = (columna) => {
    if (ordenPor === columna) setOrdenDireccion(ordenDireccion === 'ASC' ? 'DESC' : 'ASC');
    else { setOrdenPor(columna); setOrdenDireccion('ASC'); }
  };

// NUEVA FUNCIÓN AUXILIAR: Para no repetir el window.open
  const abrirRutaExportacionExcel = () => {
    let url = `/api/fuerza-trabajo/exportar?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    if (filtroSub) url += `&subcontratista=${filtroSub}`;
    window.open(url, '_blank');
  };

  // FUNCIÓN ACTUALIZADA
  const handleExportarClick = async () => {
    if (!fechaInicio || !fechaFin) {
      Swal.fire('Atención', 'Por favor selecciona las fechas de la semana que deseas exportar.', 'warning');
      return;
    }

    try {
      // 1. Ejecutamos la validación silenciosa primero
      let valUrl = `/api/fuerza-trabajo/exportar?validar=true&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      if (filtroSub) valUrl += `&subcontratista=${filtroSub}`;
      
      const res = await fetch(valUrl);
      const data = await res.json();

      // 2. Si detecta trabajadores sin cuadrilla, mostramos el Alert
      if (data.faltantes && data.faltantes.length > 0) {
        // Limitamos a 10 para no saturar el SweetAlert si son muchos
        const listaMostrar = data.faltantes.slice(0, 10).join('<br>');
        const mensajeExtra = data.faltantes.length > 10 ? '<br><i>...y otros más</i>' : '';

        Swal.fire({
          title: '⚠️ PERSONAL SIN CUADRILLA',
          html: `Hay trabajadores activos en este periodo que <b>NO tienen cuadrilla asignada</b>:<br><br><b>${listaMostrar}</b>${mensajeExtra}<br><br>Si continúas, aparecerán con "N/A" en el Excel. ¿Deseas exportar de todos modos?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Sí, exportar',
          cancelButtonText: 'Cancelar y revisar'
        }).then((result) => {
          if (result.isConfirmed) {
            abrirRutaExportacionExcel();
          }
        });

      } else {
        // 3. Flujo normal (si todo está perfecto)
        Swal.fire({
          title: '¿Exportar personal?',
          text: `Se exportará únicamente al personal activo en el periodo del ${formatDDMMYYYY(fechaInicio)} al ${formatDDMMYYYY(fechaFin)}.`,
          icon: 'info',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Sí, exportar',
          cancelButtonText: 'Cancelar'
        }).then((result) => {
          if (result.isConfirmed) {
            abrirRutaExportacionExcel();
          }
        });
      }

    } catch (error) {
      Swal.fire('Error', 'Hubo un problema verificando los datos antes de exportar.', 'error');
    }
  };

  const handleOpenImportModal = () => {
    setImportFile(null); setImportSubcontratista(''); setImportPreviewData([]);
    setImportError(''); setImportFase(1); setIsImportModalOpen(true);
  };

  const handleAnalizarExcel = async (e) => {
    e.preventDefault();
    if (!importFile || !importSubcontratista) { setImportError("Por favor selecciona un archivo y la contratista."); return; }
    setImporting(true); setImportError('');

    const formData = new FormData();
    formData.append('file', importFile); formData.append('id_subcontratista_principal', importSubcontratista);

    try {
      const res = await fetch('/api/fuerza-trabajo/importar', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        setImportPreviewData(data.data); setImportResumen({ totales: data.totalesExcel, nuevos: data.nuevos }); setImportFase(2);
      } else setImportError(data.error || "Error al procesar el archivo.");
    } catch (error) { setImportError("Error de conexión con el servidor."); } finally { setImporting(false); }
  };

  const handleGuardarImportacion = async () => {
    if (importPreviewData.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/fuerza-trabajo/importar', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trabajadores: importPreviewData }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsImportModalOpen(false); fetchTrabajadores(); 
        Swal.fire('¡Éxito!', data.mensaje, 'success');
      } else setImportError(data.error || "Error al guardar en base de datos.");
    } catch (error) { setImportError("Error de conexión al guardar."); } finally { setImporting(false); }
  };

  const handleNewClick = () => {
    setFormData(formInicial); setIsEditing(false); setEditId(null); setIsModalOpen(true);
  };

  const handleEditClick = (trabajador) => {
    setFormData({
      numero_empleado: trabajador.numero_empleado || '',
      nombre_trabajador: trabajador.nombre_trabajador || '',
      apellido_trabajador: trabajador.apellido_trabajador || '',
      puesto_categoria: trabajador.puesto_categoria,
      nss: trabajador.nss || '',
      curp: trabajador.curp || '',
      fecha_ingreso_obra: formatForInput(trabajador.fecha_ingreso_obra),
      fecha_alta_imss: formatForInput(trabajador.fecha_alta_imss),
      origen: trabajador.origen,
      id_subcontratista_ft: trabajador.id_subcontratista_ft || '',
      id_subcontratista_principal: trabajador.id_subcontratista_principal || '',
      fecha_baja: trabajador.fecha_baja ? formatForInput(trabajador.fecha_baja) : '',
      tiene_baja: !!trabajador.fecha_baja
    });
    setEditId(trabajador.id_trabajador); setIsEditing(true); setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.nss && !/^\d{11}$/.test(formData.nss)) {
      Swal.fire('Error', 'El NSS debe contener exactamente 11 dígitos numéricos.', 'error'); return;
    }
    if (formData.curp && formData.curp.length !== 18) {
      Swal.fire('Error', 'La CURP debe contener exactamente 18 caracteres.', 'error'); return;
    }
    if (formData.fecha_alta_imss && formData.fecha_ingreso_obra) {
      const alta = new Date(formData.fecha_alta_imss); const ingreso = new Date(formData.fecha_ingreso_obra);
      if (alta > ingreso) { Swal.fire('Error', 'La fecha de alta del IMSS no puede ser mayor a la fecha de ingreso.', 'error'); return; }
    }
    setSaving(true);
    try {
      const url = '/api/fuerza-trabajo';
      const method = isEditing ? 'PUT' : 'POST';
      const bodyData = isEditing ? { ...formData, id_trabajador: editId } : formData;

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData)
      });
      const data = await res.json();
      
      if (data.success) { 
        setIsModalOpen(false); fetchTrabajadores(); 
        Swal.fire('Guardado', 'Los datos del trabajador se guardaron correctamente.', 'success');
      } else Swal.fire('Error', data.error, 'error');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Error al procesar el archivo', 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- LÓGICA IMPORTADOR SUA ---
  const handleSuaFileChange = (e) => {
    if (e.target.files[0]) {
      setSuaFile(e.target.files[0]);
    }
  };

  const handleSuaUpload = async (e) => {
    e.preventDefault();
    if (!suaFile) return;

    setSuaLoading(true);
    const formData = new FormData();
    formData.append('file', suaFile);

    try {
      const res = await fetch('/api/fuerza-trabajo/importar-sua', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (result.success) {
        if (result.data.length === 0) {
          Swal.fire('Información', 'No se encontraron CURPs nuevas para actualizar en este archivo.', 'info');
        } else {
          setSuaPreview(result.data);
          setSuaFase(2);
        }
      } else {
        Swal.fire('Error', result.message || 'Error al procesar PDF', 'error');
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Ocurrió un error en el servidor', 'error');
    } finally {
      setSuaLoading(false);
    }
  };

  const handleConfirmSuaUpdate = async () => {
    setSuaLoading(true);
    try {
      const res = await fetch('/api/fuerza-trabajo/importar-sua', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': '1' // Temporal, idealmente viene del context
        },
        body: JSON.stringify({ trabajadores: suaPreview }),
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire('Éxito', data.message, 'success');
        setShowSuaModal(false);
        setSuaFile(null);
        setSuaPreview([]);
        setSuaFase(1);
        fetchTrabajadores();
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Error al actualizar datos', 'error');
    } finally {
      setSuaLoading(false);
    }
  };

  const handleBajaClick = (id) => {
    setBajaId(id); setBajaFecha(new Date().toISOString().split('T')[0]); setIsBajaModalOpen(true);
  };

  const handleBajaSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('/api/fuerza-trabajo', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_trabajador: bajaId, fecha_baja: bajaFecha })
      });
      const data = await res.json();
      if (data.success) { 
        setIsBajaModalOpen(false); fetchTrabajadores(); 
        Swal.fire('Baja Confirmada', 'El trabajador ha sido dado de baja.', 'success');
      } else Swal.fire('Error', data.error, 'error');
    } catch (error) { Swal.fire('Error', 'Error de conexión', 'error'); } finally { setSaving(false); }
  };

  const limpiarFiltros = () => { 
    setFiltroSub(''); 
    setBusqueda(''); 
    setFechaInicio(getDateString(haceUnaSemana));
    setFechaFin(getDateString(hoy));
  };

  const cuadrillasFiltradas = catCuadrillas.filter(c => c.id_subcontratista_principal == formData.id_subcontratista_principal);

  const esMesAnterior = (fechaAltaStr, fechaInicioPeriodoStr) => {
    if (!fechaAltaStr) return false;
    const alta = new Date(fechaAltaStr);
    const inicioPeriodo = new Date(fechaInicioPeriodoStr);
    
    const mesAlta = alta.getUTCMonth();
    const anioAlta = alta.getUTCFullYear();
    const mesInicio = inicioPeriodo.getUTCMonth();
    const anioInicio = inicioPeriodo.getUTCFullYear();

    if (anioAlta === anioInicio && mesAlta === mesInicio - 1) return true;
    if (anioAlta === anioInicio - 1 && mesAlta === 11 && mesInicio === 0) return true;
    if (alta < inicioPeriodo) return true; 

    return false;
  };

  const handleGenerarCertificadosMasivo = async () => {
    if (!fechaInicio || !fechaFin) {
      Swal.fire('Atención', 'Selecciona el periodo para generar los certificados.', 'warning');
      return;
    }
    
    try {
      let valUrl = `/api/fuerza-trabajo/exportar-certificados?validar=true&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      if (filtroSub) valUrl += `&subcontratista=${filtroSub}`;
      
      const res = await fetch(valUrl);
      const data = await res.json();
      
      if (data.faltantes && data.faltantes.length > 0) {
          Swal.fire({
            title: '⚠️ AVISO DE CURP FALTANTES',
            html: `Hay trabajadores de NUEVO INGRESO cuya alta del IMSS es de un mes anterior y NO tienen CURP:<br><br><b>${data.faltantes.join('<br>')}</b><br><br>Si continúas, el sistema OMITIRÁ a estas personas.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, continuar omitiéndolos',
            cancelButtonText: 'Cancelar'
          }).then((result) => {
            if (result.isConfirmed) {
              abrirRutaExportacionMasiva(true);
            }
          });
      } else {
          Swal.fire({
            title: '⚠️ EXPORTACIÓN MASIVA',
            text: `Se generarán los certificados ÚNICAMENTE para el personal de NUEVO INGRESO dado de alta entre el ${formatDDMMYYYY(fechaInicio)} y el ${formatDDMMYYYY(fechaFin)}.`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Generar Certificados',
            cancelButtonText: 'Cancelar'
          }).then((result) => {
            if (result.isConfirmed) {
              abrirRutaExportacionMasiva(false);
            }
          });
      }
    } catch (error) {
      Swal.fire('Error', 'Error verificando los datos de los certificados.', 'error');
    }
  };

  const abrirRutaExportacionMasiva = (omitirFaltantes) => {
    let url = `/api/fuerza-trabajo/exportar-certificados?omitirFaltantes=${omitirFaltantes}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    if (filtroSub) url += `&subcontratista=${filtroSub}`;
    window.open(url, '_blank');
  }

  const handleGenerarCertificadoIndividual = (trabajador) => {
    const requiereCurpEstricto = esMesAnterior(trabajador.fecha_alta_imss, fechaInicio);
    
    if (requiereCurpEstricto && (!trabajador.curp || trabajador.curp.length !== 18)) {
      Swal.fire({
        title: '⚠️ CURP FALTANTE',
        html: `No se puede generar el certificado individual de <b>${trabajador.nombre_trabajador}</b>.<br><br>Su fecha de alta en el IMSS es anterior al periodo filtrado, por lo que es OBLIGATORIO que tenga su CURP registrada.<br><br>Por favor, edita su perfil primero.`,
        icon: 'error'
      });
      return;
    }
    window.open(`/api/fuerza-trabajo/exportar-certificados?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&id_trabajador=${trabajador.id_trabajador}`, '_blank');
  };

  const handleGenerarCartaAsignacion = (trabajador) => {
    window.open(`/api/fuerza-trabajo/generar-carta-asignacion?id_trabajador=${trabajador.id_trabajador}`, '_blank');
  };

  const handleGenerarDc3Individual = (trabajador) => {
    setDc3Trabajador(trabajador);
    console.log(trabajador)
    setSelectedAgente(''); 
    setDc3FormData({
      id_curso: '',
      fecha_inicio_curso: getDateString(hoy),
      fecha_fin_curso: getDateString(hoy)
    });
    setIsDc3ModalOpen(true);
  };

const handleDc3Submit = async (e) => {
    e.preventDefault();
    if (!dc3FormData.id_curso || !dc3FormData.fecha_inicio_curso || !dc3FormData.fecha_fin_curso) {
      Swal.fire('Atención', 'Selecciona un curso y las fechas.', 'warning');
      return;
    }
    
    if (new Date(dc3FormData.fecha_inicio_curso) > new Date(dc3FormData.fecha_fin_curso)) {
      Swal.fire('Error', 'La fecha de inicio no puede ser posterior a la fecha final.', 'error');
      return;
    }

    setGeneratingDc3(true);
    const url = `/api/fuerza-trabajo/generar-dc3?id_trabajador=${dc3Trabajador.id_trabajador}&id_curso=${dc3FormData.id_curso}&fechaInicio=${dc3FormData.fecha_inicio_curso}&fechaFin=${dc3FormData.fecha_fin_curso}`;
    
    try {
      const response = await fetch(url);
      
      if (response.ok) {
        // 1. Intentamos extraer el nombre del archivo desde los headers del backend
        const disposition = response.headers.get('Content-Disposition');
        let fileName = `DC3_${dc3Trabajador.nombre_trabajador}.docx`;
        if (disposition && disposition.indexOf('filename="') !== -1) {
          fileName = disposition.split('filename="')[1].split('"')[0];
        }

        // 2. Convertimos la respuesta a un archivo binario (Blob)
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        
        // 3. Forzamos la descarga con un enlace invisible
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        // Limpiamos memoria y cerramos modal
        window.URL.revokeObjectURL(downloadUrl);
        setIsDc3ModalOpen(false);
      } else {
        // El servidor respondió con un error (400, 404, 500)
        const errorData = await response.json();
        Swal.fire({
          title: 'Atención',
          html: errorData.error, // Usamos html por si hay saltos de línea
          icon: 'warning'
        });
      }
    } catch (error) {
      console.error("Error al generar DC-3:", error);
      Swal.fire('Error', 'Hubo un problema de red al intentar conectar con el servidor.', 'error');
    } finally {
      setGeneratingDc3(false);
    }
  };

  const handleToggleActivo = async (id, currentStatus) => {
    const newStatus = currentStatus === 0 ? 1 : 0; 
    try {
      const res = await fetch('/api/fuerza-trabajo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_trabajador: id, bActivo: newStatus })
      });
      const data = await res.json();
      
      if (data.success) {
        fetchTrabajadores(); 
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Error al actualizar el estado', 'error');
    }
  };

  const filteredCursos = selectedAgente 
    ? catCursos.filter(c => c.id_agente.toString() === selectedAgente.toString()) 
    : [];

  const selectedCursoObj = catCursos.find(c => c.id_curso.toString() === dc3FormData.id_curso.toString());

  return (
    <>
    <div className="max-w-[100rem] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500" ref={topRef}>
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] p-6 lg:p-8 shadow-xl shadow-gray-200/50 dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] border border-white/80 dark:border-slate-700/50">
        
        {/* HERO BENTO HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 border-b border-gray-100 dark:border-slate-700/50 pb-6">
           <div className="w-16 h-16 bg-gradient-to-br from-[var(--recal-blue)] to-blue-500 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center text-white shrink-0">
             <Users className="w-8 h-8" />
           </div>
           <div>
             <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight leading-none mb-2">Fuerza de Trabajo</h1>
             <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base">Administración de personal, expedientes DC-3 y certificados de campo.</p>
           </div>
        </div>

        <div className="space-y-6 relative">
      
      <div className="flex flex-col xl:flex-row justify-end items-start xl:items-center space-y-4 xl:space-y-0">
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full xl:w-auto">
          
          <div className="flex items-center justify-between sm:justify-start space-x-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1.5 rounded-md shadow-sm w-full sm:w-auto">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase px-2 hidden md:inline">Filtro / Exportación:</span>
            <input type="date" className="text-xs sm:text-sm bg-transparent border-gray-300 dark:border-slate-600 dark:text-gray-200 rounded py-1 px-1 sm:px-2 focus:ring-[var(--recal-blue)] outline-none flex-1 sm:flex-none w-full sm:w-36" 
              value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 px-1">al</span>
            <input type="date" className="text-xs sm:text-sm bg-transparent border-gray-300 dark:border-slate-600 dark:text-gray-200 rounded py-1 px-1 sm:px-2 focus:ring-[var(--recal-blue)] outline-none flex-1 sm:flex-none w-full sm:w-36" 
              value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>

          <button onClick={handleExportarClick} className="flex-1 sm:flex-none justify-center bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center">
            <span className="mr-1 sm:mr-2">📊</span> Exportar
          </button>
          
          {(canManageDc3 || canManageCert) && (
            <button onClick={() => { setShowSuaModal(true); setSuaFase(1); }} className="flex-1 sm:flex-none justify-center bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center">
              <span className="mr-1 sm:mr-2">📄</span> Importar SUA
            </button>
          )}
          
          {canManageFt && (
            <button onClick={handleOpenImportModal} className="flex-1 sm:flex-none justify-center bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center">
              <Upload className="w-4 h-4 mr-1 sm:mr-2" /> Importar FT
            </button>
          )}
          {canManageFt && (
            <button onClick={handleNewClick} className="flex-1 sm:flex-none justify-center bg-[var(--recal-blue)] hover:bg-[var(--recal-blue-hover)] text-white px-3 py-2 rounded-md font-medium shadow-sm xl:ml-2">
              + Nuevo
            </button>
          )}

          {canManageCert && (
            <button onClick={handleGenerarCertificadosMasivo} className="flex-1 sm:flex-none justify-center bg-indigo-100 hover:bg-indigo-200 text-indigo-700 hover:text-indigo-800 px-3 py-2 rounded-md font-bold shadow-sm transition-colors text-xs sm:text-sm flex items-center">
              <span className="mr-1 sm:mr-2">🩺</span>Certificados
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Buscar Trabajador</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
            <input type="text" placeholder="Nombre, NSS..." className="w-full pl-10 bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 shadow-sm focus:ring-[var(--recal-blue)] outline-none sm:text-sm" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Contratista</label>
          <select className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md shadow-sm focus:ring-[var(--recal-blue)] p-2 sm:text-sm outline-none" value={filtroSub} onChange={(e) => setFiltroSub(e.target.value)}>
            <option value="">Todas...</option>
            {catPrincipales.map(empresa => (<option key={empresa.id_subcontratista} value={empresa.id_subcontratista}>{empresa.razon_social}</option>))}
          </select>
        </div>
        <div className="md:col-span-1 flex flex-col gap-2">
          <div className="flex gap-1.5 h-full items-end">
            <button 
              onClick={() => { setSoloFaltaCurp(!soloFaltaCurp); setSoloFaltaCuadrilla(false); }} 
              className={`flex-1 text-[10px] font-black border px-2 py-2 rounded-md transition-all duration-300 ${soloFaltaCurp ? 'bg-red-600 text-white border-red-700 shadow-md' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100'}`}
              title="Personal crítico sin CURP"
            >
              {soloFaltaCurp ? 'VER TODO' : 'FALTA CURP'}
            </button>
            <button 
              onClick={() => { setSoloFaltaCuadrilla(!soloFaltaCuadrilla); setSoloFaltaCurp(false); }} 
              className={`flex-1 text-[10px] font-black border px-2 py-2 rounded-md transition-all duration-300 ${soloFaltaCuadrilla ? 'bg-orange-500 text-white border-orange-600 shadow-md' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-100'}`}
              title="Personal sin cuadrilla"
            >
              {soloFaltaCuadrilla ? 'VER TODO' : 'SIN CUADRILLA'}
            </button>
          </div>
          <button 
            onClick={() => { setBusqueda(''); setFiltroSub(''); setSoloFaltaCurp(false); setSoloFaltaCuadrilla(false); }} 
            className="w-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md font-bold text-xs transition-colors border border-gray-300 dark:border-slate-600 uppercase"
          >
            Limpiar Todo
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full divide-y divide-gray-200 dark:divide-slate-700 block md:table relative">
            <thead className="bg-gray-50 dark:bg-slate-900 hidden md:table-header-group sticky top-0 z-10 shadow-sm outline outline-1 outline-gray-200 dark:outline-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('apellido_trabajador')}>Nombre {ordenPor === 'apellido_trabajador' && (ordenDireccion === 'ASC' ? '↑' : '↓')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('puesto_categoria')}>Categoría {ordenPor === 'puesto_categoria' && (ordenDireccion === 'ASC' ? '↑' : '↓')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('nss')}>NSS {ordenPor === 'nss' && (ordenDireccion === 'ASC' ? '↑' : '↓')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('fecha_ingreso_obra')}>Ingreso {ordenPor === 'fecha_ingreso_obra' && (ordenDireccion === 'ASC' ? '↑' : '↓')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('fecha_alta_imss')}>Alta {ordenPor === 'fecha_alta_imss' && (ordenDireccion === 'ASC' ? '↑' : '↓')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => manejarOrden('nombre_subcontratista')}>Contratista {ordenPor === 'nombre_subcontratista' && (ordenDireccion === 'ASC' ? '↑' : '↓')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estatus</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                {(userRole === 'Admin' || userRole === 'Master') && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Trazabilidad</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y md:divide-y-0 md:divide-gray-200 dark:md:divide-slate-700 block md:table-row-group">
              {loading ? (
                <tr className="block md:table-row"><td colSpan="10" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400 block md:table-cell">Cargando personal...</td></tr>
              ) : trabajadores.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan="10" className="px-6 py-12 text-center block md:table-cell">
                    <div className="text-gray-400 dark:text-gray-500 text-4xl mb-2">🔍</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-200">No se encontraron resultados en esta semana</p>
                  </td>
                </tr>
              ) : trabajadoresPaginados.map((t) => {
                  const fechaIngresoStr = formatForInput(t.fecha_ingreso_obra);
                  const isAlta = fechaIngresoStr >= fechaInicio && fechaIngresoStr <= fechaFin;
                  
                  const categoriasCriticas = ["SUPERVISOR DE SEGURIDAD", "OPERADOR DE MAQUINARIA", "SOLDADOR", "PINTOR", "ANDAMIERO", "ANDAMIERO A", "SANDBLASTERO", "SANDBLASTERO A", "MANIOBRISTA"];
                  const requiereCurp = t.puesto_categoria && categoriasCriticas.some(cat => t.puesto_categoria.toUpperCase().includes(cat));
                  const faltaCurp = isAlta && requiereCurp && !t.curp;
                  const hayCurp = t.curp && t.curp.length === 18;

                  return (
                    <tr key={t.id_trabajador} className="block md:table-row border border-gray-200 dark:border-slate-700 md:border-none mb-4 md:mb-0 rounded-lg shadow-sm md:shadow-none p-4 md:p-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm font-bold text-[var(--recal-blue)] dark:text-white md:text-gray-900 border-b dark:border-slate-700 md:border-none gap-4">
                        <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 shrink-0">Nombre:</span>
                        <span className="text-right md:text-left break-words max-w-[65%] md:max-w-none">{`${t.apellido_trabajador || ''} ${t.nombre_trabajador}`.trim()}</span>
                      </td>
                      <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                        <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Categoría:</span>{t.puesto_categoria}
                      </td>
                      <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                        <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">NSS:</span>{t.nss || 'N/A'}
                      </td>
                      <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                        <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Ingreso a obra:</span>{formatDDMMYYYY(t.fecha_ingreso_obra)}
                      </td>
                      <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                        <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Alta IMSS:</span>
                        {t.fecha_alta_imss ? formatDDMMYYYY(t.fecha_alta_imss) : 'N/A'}
                      </td>
                      <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm text-gray-500 dark:text-gray-300 border-b dark:border-slate-700 md:border-none">
                        <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Contratista:</span>{t.nombre_subcontratista || 'RECAL'}
                      </td>
                      
                      <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 text-sm border-b dark:border-slate-700 md:border-none">
                        <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Info:</span>
                        {canManageFt && (
                          <label className="relative inline-flex items-center cursor-pointer mt-1">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={t.bActivo !== 0}
                              onChange={() => handleToggleActivo(t.id_trabajador, t.bActivo)} 
                            />
                            <div className="w-7 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-500 peer-checked:bg-[var(--recal-blue)]"></div>
                            <span className="ml-2 text-[10px] font-bold text-gray-600 dark:text-gray-400">
                              {t.bActivo !== 0 ? 'ON' : 'OFF'}
                            </span>
                          </label>
                          )}
                          <div className="flex flex-col items-end md:items-start gap-2">
                          <div className="flex flex-wrap gap-1 justify-end md:justify-start">
                            {!isAlta && !faltaCurp && !hayCurp && <span className="text-gray-400 dark:text-gray-600">-</span>}
                            {isAlta && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">ALTA</span>}
                            {faltaCurp && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white dark:bg-red-900/30 dark:text-white">FALTA CURP</span>}
                            {hayCurp && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-600 text-white dark:bg-green-900/30 dark:text-white">CURP</span>}
                            {!t.id_subcontratista_ft && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white dark:bg-red-900/30 dark:text-white">FALTA CUADRILLA</span>}
                          </div>
                        </div>
                      </td>


                      <td className="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 text-sm border-b dark:border-slate-700 md:border-none">
                        <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Estatus:</span>
                        {t.fecha_baja ? (<span className="px-2 inline-flex text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">Baja: {formatDDMMYYYY(t.fecha_baja)}</span>) : (<span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">Activo</span>)}
                      </td>
                      <td className="flex justify-between md:justify-end items-center md:table-cell px-2 md:px-6 py-4 md:py-4 text-sm font-medium border-b dark:border-slate-700 md:border-none">
                        <span className="md:hidden font-bold text-gray-500 dark:text-gray-400">Acciones:</span>
                        <div className="flex justify-end items-center gap-2 md:gap-3 flex-wrap">

                        {canManageCert && t.puesto_categoria && ['SUPERVISOR', 'RESIDENTE'].some(rol => t.puesto_categoria.toUpperCase().includes(rol)) && (
                            <div className="relative group flex items-center justify-center">
                              <button 
                                onClick={() => handleGenerarCartaAsignacion(t)} 
                                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 p-2 rounded-md transition-colors"
                              >
                                <span className="w-4 h-4 sm:w-5 sm:h-5 block text-center">📄</span>
                              </button>
                              <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">
                                Carta de Asignación
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                        )}

                          {canManageDc3 && t.curp && t.curp.length === 18 && (
                            <div className="relative group flex items-center justify-center">
                              <button onClick={() => handleGenerarDc3Individual(t)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-gray-600 p-2 rounded-md transition-colors" disabled={!t.curp || t.curp.length !== 18}>
                                <span className="w-4 h-4 sm:w-5 sm:h-5 block text-center">⛑️</span>
                              </button>
                              <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">
                                Generar DC3
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          )}

                          {canManageCert && (
                            <div className="relative group flex items-center justify-center">
                              <button onClick={() => handleGenerarCertificadoIndividual(t)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-300/30 p-2 rounded-md transition-colors">
                                <span className="w-4 h-4 sm:w-5 sm:h-5 block text-center">🩺</span>
                              </button>
                              <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">
                                Generar Certificado
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          )}

                          <div className="relative group flex items-center justify-center">
                            <button onClick={() => handleEditClick(t)} className="text-[var(--recal-blue)] dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-md transition-colors">
                              <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">
                              Editar
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div>
                            </div>
                          </div>

                          
                          {!t.fecha_baja ? (
                            <div className="relative group flex items-center justify-center">
                              {canManageFt && (
                                <button onClick={() => handleBajaClick(t.id_trabajador)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-md transition-colors">
                                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                              )}
                              <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-50">
                                Dar Baja
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic text-xs px-2 flex items-center h-full">Retirado</span>
                          )}
                        </div>
                      </td>
                        {(userRole === 'Admin' || userRole === 'Master') && (
                          <td className="flex justify-between items-center md:table-cell px-2 md:px-4 py-2 md:py-4 border-b dark:border-slate-700 md:border-none">
                            <span className="md:hidden font-bold text-gray-500 dark:text-gray-400 text-sm">Trazabilidad:</span>
                            <div className="flex flex-col items-end md:items-start gap-1 max-w-[65%] md:max-w-none">
                              {t.creador ? (
                                <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 dark:border-green-800 flex-wrap break-words inline-block" title="Registrado por">
                                  Agregó: {t.creador}
                                </span>
                              ) : (
                                <span className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200 dark:border-slate-600 flex-wrap break-words inline-block" title="Registrado por Master">
                                  Agregó: Master
                                </span>
                              )}
                              {t.modificador && (
                                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-200 dark:border-yellow-800 flex-wrap break-words inline-block" title="Modificado por">
                                  Modificó: {t.modificador}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* CONTROLES DE PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-800 px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm gap-4 sm:gap-0 mt-4">
          <div className="text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
            Mostrando del <span className="font-bold">{indexOfFirstItem + 1}</span> al <span className="font-bold">{Math.min(indexOfLastItem, trabajadoresFiltrados.length)}</span> de <span className="font-bold">{trabajadoresFiltrados.length}</span> trabajadores
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium ${currentPage === 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors'}`}>Anterior</button>
              <div className="hidden md:flex">
                {getPageNumbers().map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${currentPage === page ? 'z-10 bg-blue-50 dark:bg-blue-900/30 border-[var(--recal-blue)] dark:border-blue-500 text-[var(--recal-blue)] dark:text-blue-400' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>{page}</button>
                ))}
              </div>
              <span className="md:hidden relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-gray-300">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className={`relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium ${currentPage === totalPages ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors'}`}>Siguiente</button>
            </nav>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>

      {/* MODAL 1: REGISTRO / EDICIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[999] p-4 w-full h-full">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-[var(--recal-gray)] dark:bg-slate-900">
              <h3 className="text-lg font-bold text-[var(--recal-blue)] dark:text-white">{isEditing ? 'Editar Trabajador' : 'Registro de Nuevo Trabajador'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Apellidos *</label>
                  <input 
                    required 
                    type="text" 
                    className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none uppercase" 
                    value={formData.apellido_trabajador} 
                    onChange={e => setFormData({...formData, apellido_trabajador: e.target.value.toUpperCase()})} 
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombres *</label>
                  <input 
                    required 
                    type="text" 
                    className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none uppercase" 
                    value={formData.nombre_trabajador} 
                    onChange={e => setFormData({...formData, nombre_trabajador: e.target.value.toUpperCase()})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Puesto / Categoría *</label>
                  <select 
                    required 
                    className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" 
                    value={formData.puesto_categoria} 
                    onChange={e => setFormData({...formData, puesto_categoria: e.target.value})}
                  >
                    <option value="" className="dark:bg-slate-800">Seleccione un puesto...</option>
                    {catPuestos.map((puesto, index) => (
                      <option key={index} value={puesto} className="dark:bg-slate-800">{puesto}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número de Seguridad Social (NSS)</label>
                  <input type="text" maxLength={11} className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none placeholder-gray-400 dark:placeholder-gray-500" placeholder="11 dígitos" value={formData.nss} onChange={e => setFormData({...formData, nss: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CURP (Opcional)</label>
                  <input 
                    type="text" 
                    maxLength={18} 
                    style={{ textTransform: 'uppercase' }}
                    className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none placeholder-gray-400 dark:placeholder-gray-500" 
                    placeholder="18 caracteres" 
                    value={formData.curp} 
                    onChange={e => setFormData({...formData, curp: e.target.value.toUpperCase()})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Alta IMSS (Opcional)</label>
                  <input type="date" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" value={formData.fecha_alta_imss} onChange={e => setFormData({...formData, fecha_alta_imss: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Ingreso a Obra *</label>
                  <input required type="date" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" value={formData.fecha_ingreso_obra} onChange={e => setFormData({...formData, fecha_ingreso_obra: e.target.value})} />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Origen *</label>
                  <select className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" value={formData.origen} onChange={e => setFormData({...formData, origen: e.target.value})}>
                    <option value="Local" className="dark:bg-slate-800">Local</option>
                    <option value="Foráneo" className="dark:bg-slate-800">Foráneo</option>
                  </select>
                </div>
                <div className="md:col-span-1 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800/50">
                  <label className="block text-sm font-bold text-blue-900 dark:text-blue-400">Contratista Principal *</label>
                  <select required className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-[var(--recal-blue)] outline-none" value={formData.id_subcontratista_principal} onChange={e => setFormData({...formData, id_subcontratista_principal: e.target.value, id_subcontratista_ft: ''})}>
                    <option value="" className="dark:bg-slate-800">Seleccione Principal...</option>
                    {catPrincipales.map(empresa => (<option key={empresa.id_subcontratista} value={empresa.id_subcontratista} className="dark:bg-slate-800">{empresa.razon_social}</option>))}
                  </select>
                </div>
                <div className={`md:col-span-1 p-3 rounded border ${!formData.id_subcontratista_principal ? 'bg-gray-100 dark:bg-slate-700/50 border-gray-200 dark:border-slate-700/50' : 'bg-white dark:bg-transparent border-gray-300 dark:border-slate-600'}`}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cuadrilla (Opcional)</label>
                  <select required disabled={!formData.id_subcontratista_principal} className={`mt-1 w-full bg-transparent rounded-md p-2 outline-none ${!formData.id_subcontratista_principal ? 'cursor-not-allowed text-gray-400 dark:text-gray-500 border-none' : 'border border-gray-300 dark:border-slate-600 dark:text-white focus:ring-[var(--recal-blue)]'}`} value={formData.id_subcontratista_ft} onChange={e => setFormData({...formData, id_subcontratista_ft: e.target.value})}>
                    <option value="" className="dark:bg-slate-800">Ninguna...</option>
                    {cuadrillasFiltradas.map(cuadrilla => (<option key={cuadrilla.id_subcontratista_ft} value={cuadrilla.id_subcontratista_ft} className="dark:bg-slate-800">{cuadrilla.nombre}</option>))}
                  </select>
                </div>
                {formData.tiene_baja && (
                  <div className="md:col-span-1 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-100 dark:border-red-800/50">
                    <label className="block text-sm font-bold text-red-900 dark:text-red-400">Fecha de Baja (Edición)</label>
                    <input 
                      type="date" 
                      className="mt-1 w-full bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-red-500 outline-none" 
                      value={formData.fecha_baja} 
                      onChange={e => setFormData({...formData, fecha_baja: e.target.value})} 
                    />
                  </div>
                )}
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-700 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--recal-blue)] text-white rounded-md hover:bg-[var(--recal-blue-hover)] transition-colors">
                  {saving ? 'Guardando...' : (isEditing ? 'Actualizar Datos' : 'Guardar Trabajador')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMACIÓN DE BAJA */}
      {isBajaModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[999] p-4 w-full h-full">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-sm w-full border dark:border-slate-700">
            <div className="px-6 py-4 border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 rounded-t-lg">
              <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Confirmar Baja</h3>
            </div>
            <form onSubmit={handleBajaSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de salida de la obra *</label>
                <input required type="date" className="mt-1 w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-red-500 outline-none" value={bajaFecha} onChange={e => setBajaFecha(e.target.value)} />
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-700 mt-6">
                <button type="button" onClick={() => setIsBajaModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium">{saving ? 'Procesando...' : 'Confirmar Baja'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: IMPORTACIÓN DE EXCEL (Carga Masiva) --- */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[999] p-4 w-full h-full">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col border dark:border-slate-700">
            
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-center">
                <FileSpreadsheet className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2" />
                <h3 className="text-xl font-bold text-purple-900 dark:text-purple-300">Importación Masiva de Personal</h3>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-2xl">&times;</button>
            </div>

            {/* Contenido */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-slate-900">
              
              {importError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 text-sm shadow-sm">
                  <p className="font-bold">Error de lectura</p>
                  <p>{importError}</p>
                </div>
              )}

              {importFase === 1 && (
                <form onSubmit={handleAnalizarExcel} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800/50">
                    Sube el formato oficial de Fuerza de Trabajo <b>(09_FUERZA_TRABAJO.xlsx)</b>. El sistema extraerá a los trabajadores a partir de la Fila 5, cruzará los datos con tu base instalada mediante el <b>NSS</b> y te mostrará únicamente a las personas que son nuevas en la obra.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">1. Selecciona a la Contratista Empleadora *</label>
                      <select required className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-3 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm" value={importSubcontratista} onChange={(e) => setImportSubcontratista(e.target.value)}>
                        <option value="" className="dark:bg-slate-800">-- Elige una opción --</option>
                        {catPrincipales.map(empresa => (
                          <option key={empresa.id_subcontratista} value={empresa.id_subcontratista} className="dark:bg-slate-800">{empresa.razon_social}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">2. Sube el archivo Excel *</label>
                      <input required type="file" accept=".xlsx, .xls" className="w-full bg-transparent border border-gray-300 dark:border-slate-600 rounded-md p-2 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 dark:file:bg-purple-900/30 file:text-purple-700 dark:file:text-purple-400 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50 dark:text-gray-300" onChange={(e) => setImportFile(e.target.files[0])} />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button type="submit" disabled={importing} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg flex items-center shadow-md transition-colors disabled:bg-gray-400 dark:disabled:bg-slate-600">
                      {importing ? 'Analizando documento...' : 'Cruzar Datos y Analizar'}
                    </button>
                  </div>
                </form>
              )}

              {importFase === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Total en el Excel</p>
                      <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{importResumen.totales}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Ya registrados (Omitidos)</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importResumen.totales - importResumen.nuevos}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800/50 shadow-sm">
                      <p className="text-xs text-purple-700 dark:text-purple-400 font-bold uppercase">Nuevos por guardar</p>
                      <p className="text-3xl font-black text-purple-700 dark:text-purple-400">{importResumen.nuevos}</p>
                    </div>
                  </div>

                  {importPreviewData.length === 0 ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg p-8 text-center">
                      <p className="text-green-700 dark:text-green-400 font-bold text-lg mb-2">¡Todo al día!</p>
                      <p className="text-green-600 dark:text-green-500">Todos los trabajadores de este Excel ya existen actualmente en tu base de datos. No hay nada nuevo que agregar.</p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
                          <thead className="bg-gray-100 dark:bg-slate-900 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Nombre</th>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Apellidos</th>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Categoría</th>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">NSS</th>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Ingreso</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {importPreviewData.map((t, idx) => (
                              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-200">{t.nombre_trabajador}</td>
                                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-200">{t.apellido_trabajador}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{t.puesto_categoria}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{t.nss || 'S/N'}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{formatDDMMYYYY(t.fecha_ingreso_obra)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end space-x-3">
              <button onClick={() => setIsImportModalOpen(false)} className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 font-medium transition-colors">
                Cancelar
              </button>
              {importFase === 2 && importPreviewData.length > 0 && (
                <button onClick={handleGuardarImportacion} disabled={importing} className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-bold transition-colors shadow-md flex items-center disabled:bg-gray-400 dark:disabled:bg-slate-600">
                  {importing ? 'Guardando...' : `Guardar ${importResumen.nuevos} Nuevos Registros`}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL 4: GENERACIÓN DE DC-3 */}
      {isDc3ModalOpen && dc3Trabajador && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[999] p-4 w-full h-full">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full border dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20">
              <div className="flex items-center">
                <span className="text-xl mr-2">⛑️</span>
                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300">Generar Constancia DC-3</h3>
              </div>
              <button onClick={() => setIsDc3ModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleDc3Submit} className="p-6 space-y-4">
              
              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-md border border-gray-200 dark:border-slate-600 mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Trabajador Seleccionado</p>
                <p className="font-bold text-gray-800 dark:text-gray-200 text-lg">
                  {`${dc3Trabajador.apellido_trabajador || ''} ${dc3Trabajador.nombre_trabajador}`.trim()}
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1 font-semibold">
                  <span className="text-gray-600 dark:text-gray-300">Fecha de ingreso:</span> {dc3Trabajador.fecha_ingreso_obra}
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1  font-semibold">
                  <span className="text-gray-600 dark:text-gray-300">Puesto:</span> {dc3Trabajador.puesto_categoria}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  <span className="text-gray-600 dark:text-gray-300">CURP:</span> {dc3Trabajador.curp}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Agente Capacitador *</label>
                <select 
                  required 
                  className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-3 focus:ring-indigo-500 outline-none shadow-sm" 
                  value={selectedAgente} 
                  onChange={e => {
                    setSelectedAgente(e.target.value);
                    setDc3FormData({...dc3FormData, id_curso: ''}); // Resetea el curso al cambiar de agente
                  }}
                >
                  <option value="" className="dark:bg-slate-800">-- Seleccione un Agente --</option>
                  {catAgentes.map(agente => (
                    <option key={agente.id_agente} value={agente.id_agente} className="dark:bg-slate-800">
                      {agente.nombre_agente}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Seleccionar Curso de Capacitación *</label>
                <select 
                  required 
                  disabled={!selectedAgente}
                  className={`w-full bg-transparent rounded-md p-3 outline-none shadow-sm ${!selectedAgente ? 'border border-gray-200 text-gray-400 cursor-not-allowed dark:border-slate-700 dark:text-gray-500' : 'border border-gray-300 dark:border-slate-600 dark:text-white focus:ring-indigo-500'}`} 
                  value={dc3FormData.id_curso} 
                  onChange={e => setDc3FormData({...dc3FormData, id_curso: e.target.value})}
                >
                  <option value="" className="dark:bg-slate-800">-- Elija un curso --</option>
                  {filteredCursos.map(curso => (
                    <option key={curso.id_curso} value={curso.id_curso} className="dark:bg-slate-800">
                      {curso.nombre_curso}
                    </option>
                  ))}
                </select>
                
                {selectedCursoObj && (
                  <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium flex items-center">
                    <span className="mr-1">⏱️</span> Duración del curso: {selectedCursoObj.duracion_horas} horas
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
              <span className="col-span-2 text-sm text-red-500 dark:text-red-400">Si el DC-3 es para personal de nuevo ingreso, asegúrate que las fechas del curso sea anterior a la fecha de ingreso.</span>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Fecha de Inicio *</label>
                  <input 
                    required 
                    type="date" 
                    className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-indigo-500 outline-none" 
                    value={dc3FormData.fecha_inicio_curso} 
                    onChange={e => setDc3FormData({...dc3FormData, fecha_inicio_curso: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Fecha de Término *</label>
                  <input 
                    required 
                    type="date" 
                    className="w-full bg-transparent border border-gray-300 dark:border-slate-600 dark:text-white rounded-md p-2 focus:ring-indigo-500 outline-none" 
                    value={dc3FormData.fecha_fin_curso} 
                    onChange={e => setDc3FormData({...dc3FormData, fecha_fin_curso: e.target.value})} 
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-700 mt-6">
                <button type="button" onClick={() => setIsDc3ModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors font-medium">
                  Cancelar
                </button>
                <button type="submit" disabled={generatingDc3} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-bold shadow-md flex items-center disabled:bg-indigo-400">
                  <span className="mr-2">📥</span> {generatingDc3 ? 'Procesando...' : 'Generar DC-3'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: IMPORTADOR SUA PDF */}
      {showSuaModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl max-w-4xl w-full border border-white/20 overflow-hidden animate-in zoom-in duration-300">
            {/* Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black flex items-center gap-3">
                  <span className="bg-white/20 p-2 rounded-xl">📄</span>
                  Actualización Masiva CURP (SUA)
                </h3>
                <p className="text-sky-100 text-sm font-medium mt-1">Sincroniza expedientes con información oficial del IMSS</p>
              </div>
              <button 
                onClick={() => setShowSuaModal(false)}
                className="hover:bg-white/20 p-2 rounded-full transition-colors text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-8">
              {suaFase === 1 ? (
                <div className="space-y-6">
                  <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/50 rounded-2xl p-6 flex gap-4 items-start">
                    <div className="bg-sky-500 text-white p-2 rounded-lg text-xl">💡</div>
                    <div className="text-sm text-sky-800 dark:text-sky-300 leading-relaxed">
                      <p className="font-bold mb-1">¿Cómo funciona?</p>
                      Sube el PDF original generado por el sistema SUA. Nuestro motor extraerá automáticamente los 11 dígitos del NSS y buscará a los trabajadores en el sistema para asignarles su CURP de 18 caracteres. No se duplicarán registros.
                    </div>
                  </div>

                  <form onSubmit={handleSuaUpload} className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-[2rem] p-12 text-center hover:border-sky-500 transition-all group bg-gray-50/50 dark:bg-slate-900/30">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={handleSuaFileChange}
                      className="hidden" 
                      id="sua-input"
                    />
                    <label htmlFor="sua-input" className="cursor-pointer space-y-4 block">
                      <div className="mx-auto w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl shadow-lg flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
                        <Upload className="w-10 h-10" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-gray-700 dark:text-white">
                          {suaFile ? suaFile.name : 'Selecciona el PDF del SUA'}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">Arrastra aquí el archivo o haz clic para buscar</p>
                      </div>
                    </label>

                    {suaFile && (
                      <button 
                        type="submit" 
                        disabled={suaLoading}
                        className="mt-8 bg-sky-600 hover:bg-sky-700 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-sky-500/30 transition-all flex items-center mx-auto disabled:opacity-50"
                      >
                        {suaLoading ? 'Procesando PDF...' : 'Analizar Documento'}
                      </button>
                    )}
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-2xl font-black text-gray-800 dark:text-white">Sugerencias de Actualización</p>
                      <p className="text-gray-500 font-medium">Se detectaron {suaPreview.length} trabajadores con CURP disponible en el PDF.</p>
                    </div>
                    <button 
                      onClick={() => setSuaFase(1)}
                      className="text-sky-600 font-bold hover:underline"
                    >
                      Cargar otro archivo
                    </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="max-h-[350px] overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                        <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Trabajador</th>
                            <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">NSS</th>
                            <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">CURP Actual</th>
                            <th className="px-6 py-4 text-left text-xs font-black text-sky-600 uppercase tracking-wider">CURP Encontrada</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                          {suaPreview.map((item, idx) => (
                            <tr key={idx} className="hover:bg-sky-50/30 dark:hover:bg-sky-900/10 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900 dark:text-white">{item.nombre}</div>
                                <div className="text-[10px] text-gray-400">Empl: {item.numero_empleado || 'S/N'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-mono">
                                {item.nss}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${item.curp_actual === 'SIN REGISTRO' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {item.curp_actual}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md text-[10px] font-black font-mono border border-green-200 dark:border-green-800/50">
                                  {item.curp_nuevo}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowSuaModal(false)}
                      className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 font-bold py-4 rounded-2xl transition-colors"
                    >
                      Descartar Todo
                    </button>
                    <button 
                      onClick={handleConfirmSuaUpdate}
                      disabled={suaLoading}
                      className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      {suaLoading ? 'Guardando cambios...' : `Actualizar ${suaPreview.length} Registros`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}