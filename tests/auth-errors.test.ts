import assert from 'node:assert/strict';
import test from 'node:test';
import { authFailureDetails, signupErrorMessage } from '../src/lib/auth-errors';

test('signup identifies provider email restrictions separately from rate limits', () => {
  assert.match(signupErrorMessage({ code: 'email_address_not_authorized' }), /no está habilitado/);
  assert.match(signupErrorMessage({ code: 'over_email_send_rate_limit' }), /límite de correos/);
  assert.match(signupErrorMessage({ code: 'over_request_rate_limit' }), /demasiados intentos/);
});

test('signup errors do not disclose whether an account exists or raw provider details', () => {
  const fallback = signupErrorMessage({ code: 'unexpected_failure' });
  assert.equal(signupErrorMessage({ code: 'user_already_exists' }), fallback);
  assert.equal(signupErrorMessage({ code: 'email_exists' }), fallback);
  assert.equal(signupErrorMessage({ code: 'unknown_backend_error' }), fallback);
  const error = {
    code: 'unexpected_failure',
    status: 500,
    message: 'private email, password or database details',
  };
  assert.deepEqual(authFailureDetails(error), { code: 'unexpected_failure', status: 500 });
  assert.deepEqual(authFailureDetails({ code: 'private@example.com' }), {
    code: 'unknown',
    status: undefined,
  });
});

test('signup distinguishes disabled registration, weak passwords and service failures', () => {
  assert.match(signupErrorMessage({ code: 'signup_disabled' }), /deshabilitado/);
  assert.match(signupErrorMessage({ code: 'email_provider_disabled' }), /deshabilitado/);
  assert.match(signupErrorMessage({ code: 'weak_password' }), /requisitos de seguridad/);
  assert.match(signupErrorMessage({ code: 'email_address_invalid' }), /correo real/);
  assert.match(signupErrorMessage({ name: 'AuthRetryableFetchError' }), /conectar/);
  assert.match(signupErrorMessage({ code: 'request_timeout' }), /tardó demasiado/);
});
