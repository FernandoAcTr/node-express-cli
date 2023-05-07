import "../alias";
import logger from "@helpers/logger";
import { Seed } from "./seed";
import { Seed as RanSeed } from "../models/seed.model";

async function seed(...seeds: Seed[]) {
  for await (const seeder of seeds) {
    const exists = await RanSeed.count({ where: { name: seeder.name } });

    if (exists == 0) {
      try {
        logger.debug(`Running ${seeder.name}...`);
        await seeder.seed();
        await RanSeed.create({name: seeder.name})
      } catch (error) {
        console.log(error);
        process.exit(1);
      }
    }
  }
}

seed().catch(console.error);
