"use client";

import { useState, useActionState, startTransition } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { addTeamMember } from "@/server/actions/teams";

interface TeamMemberAdderProps {
  teamId: string;
  organizationId: string;
  availableMembers: {
    id: string;
    userId: string;
    role: string;
    user: {
      id: string;
      name?: string | null;
      email: string;
      image?: string | null;
    };
  }[];
}

export function TeamMemberAdder({ teamId, organizationId, availableMembers }: TeamMemberAdderProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("CONTRIBUTOR");
  
  const [state, formAction] = useActionState(addTeamMember, { success: false, error: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("teamId", teamId);
    formData.append("userId", selectedUserId);
    formData.append("role", selectedRole);
    
    startTransition(() => {
      formAction(formData);
    });
    
    // Reset form after submission
    setSelectedUserId("");
    setSelectedRole("CONTRIBUTOR");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Team Member</CardTitle>
        <CardDescription>
          Add organization members to this team with specific roles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="teamId" value={teamId} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userId">Member</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((membership) => (
                    <SelectItem key={membership.id} value={membership.userId}>
                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="font-medium">
                            {membership.user.name || membership.user.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {membership.user.email}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                  <SelectItem value="PRODUCT_MANAGER">Product Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                type="submit" 
                className="w-full"
                disabled={!selectedUserId}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>
          </div>
          
          {state.error && (
            <div className="text-sm text-destructive">
              {state.error}
            </div>
          )}
          
          {state.success && (
            <div className="text-sm text-green-600">
              Team member added successfully!
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}