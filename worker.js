export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Order API
    if (url.pathname === "/api/orders" && request.method === "POST") {
      try {
        const data = await request.json();

        if (
          !data.order_id ||
          !data.uid ||
          !data.package_name ||
          data.price === undefined ||
          !data.payment_method
        ) {
          return Response.json(
            { success: false, message: "Missing order information" },
            { status: 400 }
          );
        }

        await env.DB.prepare(`
          INSERT INTO orders
          (order_id, uid, package_name, price, payment_method, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `)
          .bind(
            data.order_id,
            data.uid,
            data.package_name,
            Number(data.price),
            data.payment_method
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
            message: "Could not save order"
          },
          { status: 500 }
        );
      }
    }

    return new Response("RS TOP-UP API is running.", {
      status: 200
    });
  }
};
