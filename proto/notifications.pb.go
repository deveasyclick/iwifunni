package proto

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type SendNotificationRequest struct {
    ServiceId string            `json:"service_id"`
    ApiKey    string            `json:"api_key"`
    UserId    string            `json:"user_id"`
    Title     string            `json:"title"`
    Message   string            `json:"message"`
    Channels  []string          `json:"channels,omitempty"`
    Metadata  map[string]string `json:"metadata,omitempty"`
}

type SendNotificationResponse struct {
    JobId  string `json:"job_id"`
    Status string `json:"status"`
}

type NotificationServiceServer interface {
    SendNotification(context.Context, *SendNotificationRequest) (*SendNotificationResponse, error)
}

type UnimplementedNotificationServiceServer struct{}

func (*UnimplementedNotificationServiceServer) SendNotification(context.Context, *SendNotificationRequest) (*SendNotificationResponse, error) {
    return nil, status.Errorf(codes.Unimplemented, "method SendNotification not implemented")
}

func RegisterNotificationServiceServer(s *grpc.Server, srv NotificationServiceServer) {
    s.RegisterService(&_NotificationService_serviceDesc, srv)
}

func _NotificationService_SendNotification_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
    in := new(SendNotificationRequest)
    if err := dec(in); err != nil {
        return nil, err
    }
    if interceptor == nil {
        return srv.(NotificationServiceServer).SendNotification(ctx, in)
    }
    info := &grpc.UnaryServerInfo{
        Server:     srv,
        FullMethod: "/notifications.NotificationService/SendNotification",
    }
    handler := func(ctx context.Context, req interface{}) (interface{}, error) {
        return srv.(NotificationServiceServer).SendNotification(ctx, req.(*SendNotificationRequest))
    }
    return interceptor(ctx, in, info, handler)
}

var _NotificationService_serviceDesc = grpc.ServiceDesc{
    ServiceName: "notifications.NotificationService",
    HandlerType: (*NotificationServiceServer)(nil),
    Methods: []grpc.MethodDesc{
        {
            MethodName: "SendNotification",
            Handler:    _NotificationService_SendNotification_Handler,
        },
    },
    Streams:  []grpc.StreamDesc{},
    Metadata: "notifications.proto",
}
