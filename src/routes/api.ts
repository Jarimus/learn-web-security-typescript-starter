import { Router } from "express";
import type { Dependencies } from "../dependencies.ts";
import { getCurrentSession } from "../auth/sessions.ts";
import {
  findOrderById,
  listAllOrders,
  listOrderItems,
  listOrdersForUser,
  type OrderItem,
} from "../orders/index.ts";
import { listProducts, type Product } from "../products.ts";
import { findApiKey } from "../auth/apiKeys.ts"
import { type Order } from "../orders/index.ts";

type ProductResponse = {
  id: number;
  name: string;
  description: string;
  image_path: string;
  price_cents: number;
};

type OrderResponse = {
  id: number;
  status: Order["status"];
  total_cents: number;
  created_at: string;
};

type OrderItemResponse = {
  product_id: number;
  product_name: string;
  quantity: number;
  price_cents: number;
};  

export function createApiRouter(deps: Dependencies): Router {
  const { db } = deps;
  const router = Router();

  router.get("/api/account/orders", (req, res) => {
    const current = getCurrentSession(db, req.header("cookie"));
    if (!current) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    res.json({ orders: toOrderResponse(listOrdersForUser(db, current.user.id)) });
  });

  router.get("/api/orders/:id", (req, res) => {
    const current = getCurrentSession(db, req.header("cookie"));
    if (!current) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const orderId = Number(req.params.id);
    if (!Number.isSafeInteger(orderId)) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = findOrderById(db, orderId);
    if (!order || current.user.id != order.user_id) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const orderResponse = toOrderResponse([order])[0];
    res.json({ order: orderResponse, items: toOrderItemResponse(listOrderItems(db, order.id)) });
  });

  router.get("/api/products", (_req, res) => {
    res.json({ products: toProductResponse(listProducts(db)) });
  });

  router.get("/api/integrations/warehouse/orders", (req, res) => {
    const userApiKey = req.header("x-api-key") ?? "";
    const dbApiKey = findApiKey(db, userApiKey);
    if (!dbApiKey) {
      res.status(401).json({ error: "invalid api key"});
      return;
    }
    if (!dbApiKey.scope.includes("orders:read")) {
      res.status(403).json({ error: "unauthorized scope for api key"});
      return;
    }
    const orders = listAllOrders(db).map((order) => ({
      id: order.id,
      status: order.status,
      total_cents: order.total_cents,
      created_at: order.created_at,
    }));

    res.json({
      integration: "Warehouse Fulfillment Integration",
      orders,
    });
  });

  return router;
}

function toProductResponse(products: Product[]): ProductResponse[] {
  return products.map((p) => {
    return {
      "id": p.id,
      "name": p.name,
      "description": p.description,
      "image_path": p.image_path,
      "price_cents": p.price_cents,
    };
  })
}

function toOrderResponse(orders: Order[]): OrderResponse[] {
  return orders.map((o) => {
    return {
      "id": o.id,
      "status": o.status,
      "total_cents": o.total_cents,
      "created_at": o.created_at
    };
  })
}

function toOrderItemResponse(orders: OrderItem[]): OrderItemResponse[] {
  return orders.map((o) => {
    return {
      "price_cents": o.price_cents,
      "product_id": o.product_id,
      "product_name": o.product_name,
      "quantity": o.quantity,
    };
  })
}