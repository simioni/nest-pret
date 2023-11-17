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
  constructor(accessToken: string, expiresIn?: number) {
    this.accessToken = accessToken;
    this.expiresIn = expiresIn;
  }
  accessToken: string;
  expiresIn: number;
}
