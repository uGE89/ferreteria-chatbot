/**
 * Proyecto: PlataformaConversacional - Backend en Google Apps Script
 * Archivo: DataHelpers.gs
 * Descripción: Funciones de ayuda para obtener datos de usuarios, roles y sucursales.
 */

/**
 * Devuelve el perfil del usuario con algunos campos clave.
 * @param {string} userId - ID del usuario.
 * @returns {object} Perfil simplificado del usuario.
 */
function getUserProfile(userId) {
  const profile = obtenerDetallesDeUsuario(userId) || {};
  return {
    Nombre: profile.Nombre || '',
    Rol: profile.Rol || '',
    Sucursal: profile.Sucursal || '',
    NotasAdicionales: profile.NotasAdicionales || ''
  };
}

/**
 * Obtiene los detalles de un rol específico.
 * @param {string} roleName - Nombre del rol.
 * @returns {object} Detalles del rol o un objeto vacío.
 */
function getRoleDetails(roleName) {
  const rolesData = getSheetData(SHEET_NAMES.ROLES);
  return rolesData.find(r => r.NombreRol === roleName) || {};
}

/**
 * Obtiene los detalles de una sucursal específica.
 * @param {string} branchName - Nombre de la sucursal.
 * @returns {object} Detalles de la sucursal o un objeto vacío.
 */
function getBranchDetails(branchName) {
  const branchesData = getSheetData(SHEET_NAMES.SUCURSALES);
  return branchesData.find(b => b.NombreSucursal === branchName) || {};
}

