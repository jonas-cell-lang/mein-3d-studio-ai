(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SILMOProjectSchema = api;
})(globalThis, function () {
  const CURRENT_PROJECT_VERSION = 3;
  const SUPPORTED_PROJECT_VERSIONS = Object.freeze([3]);

  function validateProjectEnvelope(project) {
    if (!project || typeof project !== 'object' || Array.isArray(project)) {
      throw new Error('Projektdatei ist kein gültiges JSON-Objekt.');
    }
    if (project.app !== 'SILMO 3D Studio AI') {
      throw new Error('Das ist keine gültige SILMO-Projektdatei.');
    }
    if (!Number.isInteger(project.version)) {
      throw new Error('Projektdatei enthält keine gültige Versionsnummer. Unterstützt wird derzeit Version 3.');
    }
    if (!SUPPORTED_PROJECT_VERSIONS.includes(project.version)) {
      throw new Error('Nicht unterstützte Projektversion ' + project.version + '. Unterstützt wird derzeit Version 3.');
    }
    if (!Array.isArray(project.objects) || project.objects.length > 100) {
      throw new Error('Die Projektdatei enthält eine ungültige Objektliste (maximal 100 Objekte).');
    }
    return project;
  }

  return Object.freeze({
    CURRENT_PROJECT_VERSION,
    SUPPORTED_PROJECT_VERSIONS,
    validateProjectEnvelope
  });
});
