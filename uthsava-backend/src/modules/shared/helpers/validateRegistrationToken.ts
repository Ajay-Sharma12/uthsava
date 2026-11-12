import { AuthService } from "../../auth/services/auth.service";


export const validateRegistrationToken = (
  registrationToken: string,
  mobile: string,
  countryCode: string
) => {
  const decoded = AuthService.verifyRegistrationToken(registrationToken);

  if (decoded.mobile !== mobile || decoded.countryCode !== countryCode) {
    throw new Error("Registration token does not match mobile number");
  }

  return decoded;
};
