import { User } from '../../user/schemas/user.schema';

export class LoginResponse {
  constructor(token: JwtToken, user: User) {
    this.token = token;
    this.user = user;
  }
  token: JwtToken;
  user: User;
}

export class JwtToken {
  constructor(expires_in: number, access_token: string) {
    this.expires_in = expires_in;
    this.access_token = access_token;
  }
  expires_in: number;
  access_token: string;
}
