import jwt from "jsonwebtoken";
import { AppDataSource } from "@/database/datasources";
import { User } from "@/entities/user.entity";
import { BadRequest, Unauthorized } from "@/middlewares/error_handler";
import { Repository } from "typeorm";
import { hash } from '@/utils/hash'
import { config } from "@/config";
import { Role } from "@/entities/role.entity";
import { RefreshToken } from '@/entities/refresh_token.entity'

export class AuthService {
  private readonly repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  async signup(user: User) {
    const dbUser = await this.repository.findOne({
      where: { email: user.email },
    });
    if (dbUser) throw BadRequest("User already exists");

    const newUser = new User();
    newUser.email = user.email;
    newUser.role_id = Role.USER;
    newUser.password = hash.hash(user.password);
    newUser.name = user.name;

    const saved = await this.repository.save(newUser);
    const token = createToken(saved);
    const refreshToken = createRefreshToken(saved)

    await RefreshToken.save({
      user_id: saved.id,
      refresh_token: refreshToken,
    })

    return { user: saved, token: token, refresh_token: refreshToken }
  }

  async login(email: string, password: string) {
    const dbUser = await this.repository.findOne({ where: { email } });
    if (!dbUser) throw BadRequest("Bad credentials");

    const match = hash.compare(password, dbUser.password);
    if (!match) throw BadRequest("Bad credentials");

    const token = createToken(dbUser);
    const refreshToken = createRefreshToken(dbUser)

    await RefreshToken.save({ user_id: dbUser.id, refresh_token: refreshToken })

    return { user: dbUser, token: token, refresh_token: refreshToken }
  }

  async refreshToken(user_id: number, refresh_token: string) {
    const user = await User.findOne({ where: { id: user_id } })
    const token = await RefreshToken.findOne({ where: { user_id, refresh_token } })
    
    if (!user || !token) throw Unauthorized()
    if (token.expires_at < new Date()) throw Unauthorized()

    const newToken = createToken(user);
    const refreshToken = createRefreshToken(user)

    await RefreshToken.save({ user_id: user.id, refresh_token: refreshToken })

    await token.remove()

    return { token: newToken, refresh_token: refreshToken }
  }
}

function createToken(user: User) {
  return jwt.sign({ user_id: user.id }, config.SECRET, {
    expiresIn: '1h',
  })
}
function createRefreshToken(user: User) {
  return jwt.sign({ user_id: user.id, _: Math.random() }, config.SECRET, {
    expiresIn: '7d',
  })
}

export const authService = new AuthService();