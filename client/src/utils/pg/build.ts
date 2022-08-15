import { Idl } from "@project-serum/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";

import { SERVER_URL } from "../../constants";
import { PgCommon } from "./common";
import { PgProgramInfo } from "./program-info";
import { PgPkg, PkgName } from "./terminal";

interface BuildResp {
  uuid: string;
  stderr: string;
  kp: Array<number> | null;
  idl: Idl | null;
}

export type Files = string[][];



export class PgBuild {
  static async build(files: Files) {
    // Assuming all files are seahorse python ones
    const seahorsePkg = await PgPkg.loadPkg(PkgName.SEAHORSE_LANG);

    console.log({ seahorsePkg });

    const compileFn = seahorsePkg.compileSeahorse;
    if (!compileFn) {
      throw new Error('No compile function found in seahorse package');
    }

    const rustFiles = await Promise.all(files.map(file => {
      const [fileName, contents] = file
      const newFileName = fileName.replace('.py', '.rs')
      const programName = 'seahorseprogram' // TODO: replace with regex to extract
      const newContents = compileFn(contents, programName);
      return [newFileName, newContents]
    }))


    const programInfo = PgProgramInfo.getProgramInfo();

    console.log({
      files: rustFiles,
      uuid: programInfo.uuid,
      kp: programInfo.kp,
      pk: programInfo.customPk,
    })

    const resp = await fetch(`${SERVER_URL}/build`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: rustFiles,
        uuid: programInfo.uuid,
        kp: programInfo.kp,
        pk: programInfo.customPk,
      }),
    });

    const result = await PgCommon.checkForRespErr(resp.clone());
    if (result?.err) throw new Error(result.err);

    const data: BuildResp = await resp.json();

    const programId = Keypair.fromSecretKey(Uint8Array.from(data.kp ?? []))
    console.log({ programId: programId.publicKey.toBase58() })

    // Update programInfo localStorage
    PgProgramInfo.update({
      uuid: data.uuid,
      idl: data.idl,
      kp: data.kp,
    });

    return { uuid: data.uuid, stderr: data.stderr };
  }
}
