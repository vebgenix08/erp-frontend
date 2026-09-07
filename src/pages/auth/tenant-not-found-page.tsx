import { TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";

export function TenantNotFoundPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <TriangleAlert size={18} />
        </span>
        <CardTitle>Institution access unavailable</CardTitle>
        <p className="text-sm text-slate-500">
          Authentication succeeded, but no active tenant membership is assigned. Contact your
          institution administrator.
        </p>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link to="/login">Return to login</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
