export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ==========================================
    // ADMIN AUTHENTICATION
    // ==========================================

    function isAdmin(request) {
      const auth = request.headers.get("Authorization");

      if (!auth || !auth.startsWith("Bearer ")) {
        return false;
      }

      const token = auth.slice(7);

      return env.ADMIN_TOKEN && token === env.ADMIN_TOKEN;
    }


    // ==========================================
    // CREATE ORDER
    // ==========================================

    if (
      url.pathname === "/api/order" &&
      request.method === "POST"
    ) {
      try {
        const data = await request.json();

        if (
          !data.order_id ||
          !data.uid ||
          !data.package_name ||
          data.price === undefined ||
          !data.payment_method ||
          !data.transaction_id
        ) {
          return Response.json(
            {
              success: false,
              message: "Missing order data"
            },
            { status: 400 }
          );
        }

        const price = Number(data.price);

        if (Number.isNaN(price)) {
          return Response.json(
            {
              success: false,
              message: "Invalid price"
            },
            { status: 400 }
          );
        }

        const transactionId =
          String(data.transaction_id).trim();

        if (!transactionId) {
          return Response.json(
            {
              success: false,
              message: "Transaction ID is required"
            },
            { status: 400 }
          );
        }

        await env.DB.prepare(`
          INSERT INTO orders
          (
            order_id,
            uid,
            package_name,
            price,
            payment_method,
            transaction_id,
            status
          )
          VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `)
          .bind(
            String(data.order_id),
            String(data.uid),
            String(data.package_name),
            price,
            String(data.payment_method),
            transactionId
          )
          .run();

        return Response.json({
          success: true,
          message: "Order submitted successfully",
          order_id: data.order_id
        });

      } catch (error) {
        return Response.json(
          {
            success: false,
            message: "Could not save order",
            error: String(error)
          },
          { status: 500 }
        );
      }
    }


    // ==========================================
    // ADMIN - GET ORDERS
    // ==========================================

    if (
      url.pathname === "/api/admin/orders" &&
      request.method === "GET"
    ) {
      if (!isAdmin(request)) {
        return Response.json(
          {
            success: false,
            message: "Unauthorized"
          },
          { status: 401 }
        );
      }

      try {
        const result = await env.DB.prepare(`
          SELECT
            id,
            order_id,
            uid,
            package_name,
            price,
            payment_method,
            transaction_id,
            status,
            created_at
          FROM orders
          ORDER BY id DESC
          LIMIT 100
        `).all();

        return Response.json({
          success: true,
          orders: result.results || []
        });

      } catch (error) {
        return Response.json(
          {
            success: false,
            message: "Could not load orders",
            error: String(error)
          },
          { status: 500 }
        );
      }
    }


    // ==========================================
    // ADMIN - UPDATE ORDER STATUS
    // ==========================================

    if (
      url.pathname === "/api/admin/order/status" &&
      request.method === "POST"
    ) {
      if (!isAdmin(request)) {
        return Response.json(
          {
            success: false,
            message: "Unauthorized"
          },
          { status: 401 }
        );
      }

      try {
        const data = await request.json();

        if (!data.order_id || !data.status) {
          return Response.json(
            {
              success: false,
              message: "Order ID and status are required"
            },
            { status: 400 }
          );
        }

        const allowedStatuses = [
          "pending",
          "paid",
          "rejected"
        ];

        if (!allowedStatuses.includes(data.status)) {
          return Response.json(
            {
              success: false,
              message: "Invalid status"
            },
            { status: 400 }
          );
        }

        const result = await env.DB.prepare(`
          UPDATE orders
          SET status = ?
          WHERE order_id = ?
        `)
          .bind(
            data.status,
            data.order_id
          )
          .run();

        if (!result.meta || result.meta.changes === 0) {
          return Response.json(
            {
              success: false,
              message: "Order not found"
            },
            { status: 404 }
          );
        }

        return Response.json({
          success: true,
          message: "Order status updated",
          order_id: data.order_id,
          status: data.status
        });

      } catch (error) {
        return Response.json(
          {
            success: false,
            message: "Could not update order",
            error: String(error)
          },
          { status: 500 }
        );
      }
    }


    // ==========================================
    // API METHOD CHECK
    // ==========================================

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        {
          success: false,
          message: "API endpoint not found"
        },
        { status: 404 }
      );
    }


    // ==========================================
    // SERVE WEBSITE FILES
    // ==========================================

    return env.ASSETS.fetch(request);
  }
};
