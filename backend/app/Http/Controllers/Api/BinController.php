<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BinController extends Controller
{
    private function rules(): array
    {
        return [
            'location' => ['required', 'string', 'max:150'],
            'area' => ['required', 'string', 'max:100'],
            'capacity_kg' => ['required', 'numeric', 'min:1', 'max:9999'],
            'current_level' => ['required', 'in:Low,Medium,High,Full'],
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $bins = Bin::query()
            ->when($request->query('keyword'), fn ($q, $kw) => $q->where(fn ($q) => $q->where('location', 'like', "%$kw%")->orWhere('area', 'like', "%$kw%")))
            ->when($request->query('level'), fn ($q, $v) => $q->where('current_level', $v))
            ->orderBy('id')
            ->get();

        return response()->json($bins);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(Bin::create($request->validate($this->rules())), 201);
    }

    public function update(Request $request, Bin $bin): JsonResponse
    {
        $bin->update($request->validate($this->rules()));

        return response()->json($bin);
    }

    public function destroy(Bin $bin): JsonResponse
    {
        $bin->delete();

        return response()->json(['message' => 'Bin deleted.']);
    }
}
