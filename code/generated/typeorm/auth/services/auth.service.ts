import jwt from "jsonwebtoken";
import { AppDataSource } from "@/database/datasources";
import { User } from "@/entities/user.entity";
import { HTTPError, UnauthorizedError } from "@/middlewares/error_handler";
import { Repository } from "typeorm";
import { PasswordEncrypter } from "./passsword_encripter";
import { settings } from "@/config/settings";
import { Roles } from "@/entities/role.entity";
import { Token } from '@/entities/token.entity'

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
    const token = this.createToken(saved);
    const refreshToken = this.createToken(saved)

    await Token.save({
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

    const token = this.createToken(dbUser);

    let refreshToken = await Token.findOne({ where: { user_id: dbUser.id } })
    if (!refreshToken) {
      refreshToken = await Token.save({
        user_id: dbUser.id,
        refresh_token: this.createToken(dbUser),
      })
    }

    return { user: dbUser, token: token, refresh_token: refreshToken.refresh_token }
  }

  async refreshToken(user_id: number, refresh_token: string) {
    const user = await User.findOne({
      where: { id: user_id, refresh_token: { refresh_token } },
    });
    if(!user) throw new UnauthorizedError()

    const token = this.createToken(user);

    return { token };
  }

  private createToken(user: User) {
    return jwt.sign({ user_id: user.id }, settings.SECRET, {
      expiresIn: '1h',
    });
  }
}
