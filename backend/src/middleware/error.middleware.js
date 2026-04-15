export function notFound(req, res) {
  return res.status(404).json({ ok: false, message: 'Endpoint bulunamadı.' });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  console.error(err);
  return res.status(status).json({
    ok: false,
    message: err.message || 'Sunucu hatası.',
    details: err.details || undefined
  });
}
