import { env } from '@config/env.config';
import { uniqueId } from './unique';

export type UserCredentials = {
  username: string;
  password: string;
};

/**
 * Fluent builder for login credentials. Starts from the configured admin user,
 * so a test only states what is *different* about the user it needs:
 *
 *   aUser().withWrongPassword().build()
 */
export class UserBuilder {
  private user: UserCredentials = {
    username: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
  };

  withUsername(username: string): this {
    this.user.username = username;
    return this;
  }

  withPassword(password: string): this {
    this.user.password = password;
    return this;
  }

  /** A username that does not exist (unique per call, so parallel-safe). */
  withUnknownUsername(): this {
    return this.withUsername(uniqueId('unknown-user'));
  }

  /** Keeps the username but uses a password that cannot be correct. */
  withWrongPassword(): this {
    return this.withPassword(uniqueId('wrong-password'));
  }

  build(): UserCredentials {
    return { ...this.user };
  }
}

export const aUser = (): UserBuilder => new UserBuilder();

/** Ready-made users for the common cases. */
export const Users = {
  admin: (): UserCredentials => aUser().build(),
  unknown: (): UserCredentials => aUser().withUnknownUsername().build(),
  withWrongPassword: (): UserCredentials => aUser().withWrongPassword().build(),
} as const;
