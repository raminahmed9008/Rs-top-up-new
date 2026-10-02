export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ==============================
    // CREATE ORDER API
    // ==============================
    if (url.pathname === "/api/order" && request.method === "POST") {
      try {
        const data = await request.json();

        // Check required order data
        if (
          !data.order_id ||
          !data.uid ||
          !data.package_name ||
          data.price === undefined ||
          !data.payment_method
        ) {
          return Response.json(
            {
              success: false,
              message: "Missing order data"
            },
            { status: 400 }
          );
        }

        // Convert price to number
        const price = Number(data.price);

        if (Number.isNaN(price)) {
          return Response.json(
            {
              success: false,
              message: "Invalid price",
              error: "Price must be a number"
            },
            { status: 400 }
          );
        }

        // Save order to D1 database
        await env.DB.prepare(`
          INSERT INTO orders
          (
            order_id,
            uid,
            package_name,
            price,
            payment_method,
            status
          )
          VALUES (?, ?, ?, ?, ?, 'pending')
        `)
          .bind(
            String(data.order_id),
            String(data.uid),
            String(data.package_name),
            price,
            String(data.payment_method)
          )
          .run();

        // Successful response
        return Response.json({
          success: true,
          message: "Order saved successfully",
          order_id: data.order_id
        });

      } catch (error) {

        // Detailed error for debugging
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
    // API STATUS
    // ==============================
    if (url.pathname === "/api/order" && request.method !== "POST") {
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
