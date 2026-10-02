export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ==============================
    // CREATE ORDER API
    // ==============================
    if (url.pathname === "/api/order" && request.method === "POST") {
      try {
        const data = await request.json();

        // Required fields
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

        const transactionId = String(data.transaction_id).trim();

        if (!transactionId) {
          return Response.json(
            {
              success: false,
              message: "Transaction ID is required"
            },
            { status: 400 }
          );
        }

        // Save order to D1
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
          message: "Order saved successfully",
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

    // ==============================
    // OTHER METHODS
    // ==============================
    if (url.pathname === "/api/order") {
      return Response.json(
        {
          success: false,
          message: "Only POST requests are allowed"
        },
        { status: 405 }
      );
    }

    // ==============================
    // WORKER STATUS
    // ==============================
    return new Response(
      "RS TOP-UP API is running.",
      {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8"
        }
      }
    );
  }
};
