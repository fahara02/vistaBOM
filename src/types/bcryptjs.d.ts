/**
 * Type declarations for bcryptjs
 */
declare module 'bcryptjs' {
  /**
   * Synchronously generates a hash for the given string.
   * @param {string|Buffer} s - String to hash
   * @param {number|string} salt - Salt length to generate or salt to use
   * @returns {string} Resulting hash
   */
  export function hashSync(s: string | Buffer, salt: number | string): string;

  /**
   * Synchronously tests a string against a hash.
   * @param {string|Buffer} s - String to compare
   * @param {string} hash - Hash to test against
   * @returns {boolean} true if matching, otherwise false
   */
  export function compareSync(s: string | Buffer, hash: string): boolean;

  /**
   * Gets the number of rounds used to encrypt a hash.
   * @param {string} hash - Hash to extract the used rounds from
   * @returns {number} Number of rounds used
   */
  export function getRounds(hash: string): number;

  /**
   * Generates a salt synchronously.
   * @param {number} rounds - Number of rounds to use, defaults to 10 if omitted
   * @returns {string} Resulting salt
   */
  export function genSaltSync(rounds?: number): string;

  /**
   * Generates a hash for the given string.
   * @param {string|Buffer} s - String to hash
   * @param {number|string} salt - Salt length to generate or salt to use
   * @param {function} callback - Callback receiving the error, if any, and the resulting hash
   */
  export function hash(s: string | Buffer, salt: number | string, callback: (err: Error | null, hash: string) => void): void;

  /**
   * Generates a salt.
   * @param {number} rounds - Number of rounds to use, defaults to 10 if omitted
   * @param {function} callback - Callback receiving the error, if any, and the resulting salt
   */
  export function genSalt(rounds: number, callback: (err: Error | null, salt: string) => void): void;
  export function genSalt(callback: (err: Error | null, salt: string) => void): void;

  /**
   * Tests a string against a hash.
   * @param {string|Buffer} s - String to compare
   * @param {string} hash - Hash to test against
   * @param {function} callback - Callback receiving the error, if any, and the result
   */
  export function compare(s: string | Buffer, hash: string, callback: (err: Error | null, success: boolean) => void): void;
}
