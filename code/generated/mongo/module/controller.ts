import { NextFunction, Request, Response } from 'express'
import {
  __ServiceName__Destroyer,
  __ServiceName__Finder,
  __ServiceName__Saver,
  __ServiceName__Updater,
} from './services'

/**
 * Return all entities
 * @param req
 * @param res
 * @param next
 */
export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  const finder = new __ServiceName__Finder()
}

/**
 * Return one instance of entity
 * @param req
 * @param res
 * @param next
 */
export async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { id } = req.params
  const finder = new __ServiceName__Finder()
}

/**
 * Save an entity
 * @param req
 * @param res
 * @param next
 */
export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  const saver = new __ServiceName__Saver()
}

/**
 * Update an entity
 * @param req
 * @param res
 * @param next
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { id } = req.params
  const updater = new __ServiceName__Updater()
}

/**
 * Destroy one instance of an entity
 * @param req
 * @param res
 * @param next
 */
export async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { id } = req.params
  const destroyer = new __ServiceName__Destroyer()
}
