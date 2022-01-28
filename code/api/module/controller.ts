import { NextFunction, Request, Response } from 'express'
import { __ServiceName__ } from './__modulename__.service'

/**
 * Return all entities
 * @param req
 * @param res
 * @param next
 */
export async function index(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const service = new __ServiceName__()
}

/**
 * Return one instance of entity
 * @param req
 * @param res
 * @param next
 */
export async function show(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { id } = req.params
  const service = new __ServiceName__()
}

/**
 * Save an entity
 * @param req
 * @param res
 * @param next
 */
export async function store(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const service = new __ServiceName__()
}

/**
 * Update an entity
 * @param req
 * @param res
 * @param next
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { id } = req.params
  const service = new __ServiceName__()
}

/**
 * Destroy one instance of an entity
 * @param req
 * @param res
 * @param next
 */
export async function destroy(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { id } = req.params
  const service = new __ServiceName__()
}
