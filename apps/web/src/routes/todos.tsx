import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ticket-app/ui/components/card";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Input } from "@ticket-app/ui/components/input";
import { Loader2, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export const Route = createFileRoute("/todos")({
  loader: async ({ context }) => {
    const todos = await context.orpc.todo.getAll.query();
    return { todos };
  },
  component: TodosRoute,
});

function TodosRoute() {
  const { todos } = Route.useLoaderData<typeof Route>();
  const [newTodoText, setNewTodoText] = useState("");
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    orpc.todo.create.mutationOptions({
      onSuccess: () => {
        setNewTodoText("");
        queryClient.invalidateQueries({ queryKey: ["todo"] });
      },
    }),
  );

  const toggleMutation = useMutation(
    orpc.todo.toggle.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["todo"] });
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.todo.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["todo"] });
      },
    }),
  );

  const handleAddTodo = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      createMutation.mutate({ text: newTodoText });
    }
  };

  const handleToggleTodo = (id: number, completed: boolean) => {
    toggleMutation.mutate({ id, completed: !completed });
  };

  const handleDeleteTodo = (id: number) => {
    deleteMutation.mutate({ id });
  };

  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Todo List</CardTitle>
          <CardDescription>Manage your tasks efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTodo} className="mb-6 flex items-center space-x-2">
            <Input
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add a new task..."
              disabled={createMutation.isPending}
            />
            <Button type="submit" disabled={createMutation.isPending || !newTodoText.trim()}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </form>

          {!todos || todos.length === 0 ? (
            <p className="py-4 text-center">No todos yet. Add one above!</p>
          ) : (
            <ul className="space-y-2">
              {todos.map((todo: Todo) => (
                <li
                  key={todo.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleTodo(todo.id, todo.completed)}
                      id={`todo-${todo.id}`}
                    />
                    <label
                      htmlFor={`todo-${todo.id}`}
                      className={`${todo.completed ? "line-through" : ""}`}
                    >
                      {todo.text}
                    </label>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTodo(todo.id)}
                    aria-label="Delete todo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
