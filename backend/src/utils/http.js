export function ok(res, data = {}, message = 'OK') {
  return res.status(200).json({ ok: true, message, ...data });
}

export function created(res, data = {}, message = 'Created') {
  return res.status(201).json({ ok: true, message, ...data });
}

export function fail(status, message, details) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  throw error;
}
