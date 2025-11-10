const getEnvPixelId = (envKey) => {
  const value = process.env[envKey];
  if (!value && process.env.NODE_ENV !== 'production') {
    console.warn(`[MetaPixel] Variável de ambiente ${envKey} não definida.`);
  }
  return value || '';
};

export const META_PIXEL_ID_CONSULTOR = getEnvPixelId('REACT_APP_META_PIXEL_ID_CONSULTOR');
export const META_PIXEL_ID_CAPTURA_CLINICA = getEnvPixelId('REACT_APP_META_PIXEL_ID_CAPTURA_CLINICA');