"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useActionState } from "react";
import { addTeamMember } from "@/server/actions/teams";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

interface TeamMemberModalProps {
  teamId: string;
  teamName: string;
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
  trigger?: React.ReactNode;
}

export function TeamMemberModal({ 
  teamId, 
  teamName,
  availableMembers,
  trigger 
}: TeamMemberModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("CONTRIBUTOR");
  
  const [state, formAction] = useActionState(addTeamMember, { success: false, error: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("teamId", teamId);
    formData.append("userId", selectedUserId);
    formData.append("role", selectedRole);
    
    await formAction(formData);
  };

  // Show notifications when state changes
  React.useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    } else if (state.success) {
      toast.success("Team member added successfully!");
      // Close modal and reset form after successful submission
      setOpen(false);
      setSelectedUserId("");
      setSelectedRole("CONTRIBUTOR");
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Member to {teamName}</DialogTitle>
          <DialogDescription>
            Add organization members to this team with specific roles
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="teamId" value={teamId} />
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="userId" className="text-sm font-medium">
                Member
              </label>
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
              <label htmlFor="role" className="text-sm font-medium">
                Role
              </label>
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
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedUserId}
            >
              Add Member
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}