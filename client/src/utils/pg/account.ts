import { Idl, Program, Provider } from "@project-serum/anchor";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { AccountDoesNotExistError, AccountError } from "../../constants";
import { PgCommon } from "./common";
import { PgProgramInfo } from "./program-info";
import { PgWallet } from "./wallet";

export class PgAccount {
  private static async getProgram(
    idl: Idl,
    conn: Connection,
    wallet: PgWallet | AnchorWallet
  ) {
    const provider = new Provider(conn, wallet, Provider.defaultOptions());

    // Get program pk
    const programPkResult = PgProgramInfo.getPk();
    if (programPkResult.err) throw new Error(programPkResult.err);
    const programPk = programPkResult.programPk!;

    const program = new Program(idl, programPk, provider);
    return program;
  }

  static async fetchAll(
    accountName: string,
    idl: Idl,
    conn: Connection,
    wallet: PgWallet | AnchorWallet
  ) {
    const program = await this.getProgram(idl, conn, wallet)
    const camelAccountName = PgCommon.camelize(accountName);
    try {
      const allAccountData = await program.account[camelAccountName].all();
      return allAccountData;
    } catch (err: any) {
      throw new AccountError(`Unknown error fetching account data for ${camelAccountName}`);
    }
  }

  static async fetchOne(
    accountName: string,
    address: PublicKey,
    idl: Idl,
    conn: Connection,
    wallet: PgWallet | AnchorWallet
  ) {
    const program = await this.getProgram(idl, conn, wallet)
    const camelAccountName = PgCommon.camelize(accountName);
    try {
      const accountData = await program.account[camelAccountName].fetch(address);
      return accountData;
    } catch (err: any) {
      if (err instanceof Error && err.message.startsWith('Account does not exist')) {
        throw new AccountDoesNotExistError(camelAccountName, address);
      }
      throw new AccountError(`Unknown error fetching account data for ${camelAccountName} at ${address.toBase58()}`);
    }
  }
}
