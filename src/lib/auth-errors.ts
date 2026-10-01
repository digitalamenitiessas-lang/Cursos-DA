type AuthFailure = { code?: string; name?: string; status?: number };

/** Only expose messages we control, never provider messages or account existence. */
export function signupErrorMessage(error: AuthFailure): string {
  switch (error.code) {
    case 'email_address_not_authorized':
      return 'No pudimos enviar la verificación: el servicio de correo todavía no está habilitado para esta dirección. Contactá a Digital Amenities.';
    case 'over_email_send_rate_limit':
      return 'Se alcanzó el límite de correos de verificación. Esperá un rato antes de volver a crear tu cuenta.';
    case 'over_request_rate_limit':
      return 'Hubo demasiados intentos seguidos. Esperá unos minutos y volvé a intentar.';
    case 'signup_disabled':
    case 'email_provider_disabled':
      return 'El registro por correo está temporalmente deshabilitado. Contactá a Digital Amenities.';
    case 'weak_password':
      return 'La contraseña no cumple los requisitos de seguridad. Probá una más larga que combine letras, números y símbolos.';
    case 'email_address_invalid':
      return 'Usá un correo real al que tengas acceso. El servicio no admite direcciones de ejemplo o prueba.';
    case 'request_timeout':
      return 'El servicio tardó demasiado en responder. Volvé a intentar en unos minutos.';
    default:
      if (error.name === 'AuthRetryableFetchError')
        return 'No pudimos conectar con el servicio de cuentas. Volvé a intentar en unos minutos.';
      return 'No se pudo crear la cuenta. Intentá nuevamente más tarde o ingresá si ya tenés una.';
  }
}

/** Server diagnostics exclude email, password, tokens and the raw provider message. */
export function authFailureDetails(error: AuthFailure) {
  return {
    code: error.code && /^[a-z_]{1,64}$/.test(error.code) ? error.code : 'unknown',
    status: typeof error.status === 'number' ? error.status : undefined,
  };
}
