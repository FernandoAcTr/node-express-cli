import jwt from "jsonwebtoken";
import { AppDataSource } from "@/database/datasources";
import { User } from "@/entities/user.entity";
import { HTTPError, UnauthorizedError } from "@/middlewares/error_handler";
import { Repository } from "typeorm";
import { PasswordEncrypter } from "./passsword_encripter";
import { settings } from "@/config/settings";
import { Roles } from "@/entities/role.entity";
import { RefreshToken } from '@/entities/refresh_token.entity'

export class AuthService {
  private readonly repository: Repository<User>;
  private readonly passwordEncrypter: PasswordEncrypter;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
    this.passwordEncrypter = new PasswordEncrypter();
  }

  async signup(user: User) {
    const dbUser = await this.repository.findOne({
      where: { email: user.email },
    });
    if (dbUser) throw new HTTPError(400, "Email already exists");

    const newUser = new User();
    newUser.email = user.email;
    newUser.role_id = Roles.USER;
    newUser.password = this.passwordEncrypter.encrypt(user.password);
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
    if (!dbUser) throw new HTTPError(400, "Bad credentials");

    const match = this.passwordEncrypter.compare(password, dbUser.password);
    if (!match) throw new HTTPError(400, "Bad credentials");

    const token = createToken(dbUser);
    const refreshToken = createRefreshToken(dbUser)

    await RefreshToken.save({ user_id: dbUser.id, refresh_token: refreshToken })

    return { user: dbUser, token: token, refresh_token: refreshToken }
  }

  async refreshToken(user_id: number, refresh_token: string) {
    const user = await User.findOne({ where: { id: user_id } })
    const token = await RefreshToken.findOne({ where: { user_id, refresh_token } })
    
    if (!user || !token) throw new UnauthorizedError()
    if (token.expires_at < new Date()) throw new UnauthorizedError()

    const newToken = createToken(user);
    const refreshToken = createRefreshToken(user)

    await RefreshToken.save({ user_id: user.id, refresh_token: refreshToken })

    await token.remove()

    return { token: newToken, refresh_token: refreshToken }
  }
}

function createToken(user: User) {
  return jwt.sign({ user_id: user.id }, settings.SECRET, {
    expiresIn: '1h',
  })
}
function createRefreshToken(user: User) {
  return jwt.sign({ user_id: user.id, _: Math.random() }, settings.SECRET, {
    expiresIn: '7d',
  })
}
