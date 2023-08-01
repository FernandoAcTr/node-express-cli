import "../alias";
import logger from "@helpers/logger";
import { Seed } from "./seed";
import { Seed as RanSeed } from "../entities/seed.entity";

async function seed(...seeds: Seed[]) {
  for await (const seeder of seeds) {
    const exists = await RanSeed.count({ where: { id: seeder.id } });

    if (exists == 0) {
      try {
        logger.debug(`Running ${seeder.id}...`);
        await seeder.seed();
        await RanSeed.create({id: seeder.id})
      } catch (error) {
        console.log(error);
        process.exit(1);
      }
    }
  }
}

seed().catch(console.error);
