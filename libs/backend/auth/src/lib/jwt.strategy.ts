import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env['JWT_SECRET'] || 'super-secret-dev-key',
        });
    }

    async validate(payload: any) {
        return {
            id: payload.sub, // FIXED: Map sub to id so controller can read req.user.id
            email: payload.email,
            organizationId: payload.orgId,
            role: payload.role
        };
    }
}
