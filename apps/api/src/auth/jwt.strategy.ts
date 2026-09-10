import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { getJwtSecret } from './jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        fullName: true,
        studentId: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
      },
    });

    if (!user || !user.isActive || !user.emailVerified) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      fullName: user.fullName,
      studentId: user.studentId,
      email: user.email,
      role: user.role,
    };
  }
}
