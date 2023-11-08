import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtConfig } from '../../config/interfaces/jwt-config.interface';
import { UserService } from '../../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  constructor(
    readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    const jwtConfig = configService.get<JwtConfig>('jwt');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      passReqToCallback: true,
      secretOrKey: jwtConfig.secret,
    });
  }

  public async validate(req: any, payload: any, done: (...arg) => any) {
    try {
      const user = await this.userService.findOne(payload._id);
      done(null, user);
    } catch (error) {
      this.logger.error(error);
      return done(new UnauthorizedException(), false);
    }
  }
}
